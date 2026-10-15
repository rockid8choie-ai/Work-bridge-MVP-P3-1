import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/server/db";
import { ApiError } from "@/lib/server/api";
import {
  draftAccepted,
  draftProjectCancelled,
  draftRecruitClosed,
  draftRejected,
  draftRejectedAuto,
  notifyMany,
} from "@/lib/server/notify";

/**
 * 프로젝트 상태 전이 (docs/02-ERD.md 3장·4장).
 * 상태가 바뀌면 지원서·알림도 같이 바뀌어야 하므로 전부 트랜잭션으로 묶는다.
 */

type Tx = Prisma.TransactionClient;

/**
 * 시간 경과에 따른 자동 전환 (B-15, B-16).
 * 스케줄러 없이 목록·상세·지원 시점에 호출해 "읽을 때 맞춘다".
 * 2주 MVP 에서 크론을 붙이는 것보다 단순하고, 사용자가 보는 순간에는 항상 맞다.
 */
export async function syncRecruitStatuses() {
  const now = new Date();

  await prisma.project.updateMany({
    where: { deletedAt: null, recruitStatus: "scheduled", recruitStartAt: { lte: now } },
    data: { recruitStatus: "open" },
  });

  const expired = await prisma.project.findMany({
    where: { deletedAt: null, recruitStatus: { not: "closed" }, deadlineAt: { lt: now } },
    select: { id: true },
  });

  for (const p of expired) {
    await prisma.$transaction((tx) => closeRecruitingTx(tx, p.id));
  }
}

/**
 * 모집 마감 — 자동(마감일) · 수동(건물주) 공용 (B-21).
 * 미처리 지원은 일괄 거절, 지원자 전원에게 알림.
 */
export async function closeRecruitingTx(tx: Tx, projectId: string) {
  const project = await tx.project.findUniqueOrThrow({
    where: { id: projectId },
    select: { id: true, title: true, recruitStatus: true },
  });
  if (project.recruitStatus === "closed") return project;

  const pending = await tx.application.findMany({
    where: { projectId, status: "pending" },
    select: { id: true, freelancerId: true },
  });

  await tx.application.updateMany({
    where: { id: { in: pending.map((a) => a.id) } },
    data: { status: "rejected" },
  });

  const updated = await tx.project.update({
    where: { id: projectId },
    data: { recruitStatus: "closed" },
    select: { id: true, title: true, recruitStatus: true },
  });

  await notifyMany(
    tx,
    pending.map((a) => draftRecruitClosed({ freelancerId: a.freelancerId, projectTitle: project.title }))
  );

  return updated;
}

/**
 * 지원 수락 (B-19, B-20, B-24).
 * 한 번에 다섯 가지가 바뀐다: 해당 지원 accepted · 나머지 rejected · 프로젝트 closed+awaiting_contract ·
 * 수락 알림 1건 · 자동거절 알림 N건. 하나라도 빠지면 상태가 어긋나므로 반드시 한 트랜잭션.
 */
export async function acceptApplication(applicationId: string, clientId: string) {
  return prisma.$transaction(async (tx) => {
    const app = await tx.application.findUnique({
      where: { id: applicationId },
      include: { project: { select: { id: true, title: true, clientId: true, dealStatus: true, deletedAt: true } } },
    });

    if (!app || app.project.deletedAt) throw new ApiError(404, "NOT_FOUND", "지원서를 찾을 수 없어요");
    if (app.project.clientId !== clientId) throw new ApiError(403, "FORBIDDEN", "내 프로젝트의 지원만 처리할 수 있어요");
    if (app.status !== "pending") throw new ApiError(409, "ALREADY_DECIDED", "이미 처리된 지원이에요");
    if (app.project.dealStatus) throw new ApiError(409, "ALREADY_IN_DEAL", "이미 다른 전문가와 거래가 진행 중이에요");

    const others = await tx.application.findMany({
      where: { projectId: app.projectId, status: "pending", id: { not: app.id } },
      select: { id: true, freelancerId: true },
    });

    await tx.application.update({ where: { id: app.id }, data: { status: "accepted" } });
    await tx.application.updateMany({
      where: { id: { in: others.map((o) => o.id) } },
      data: { status: "rejected" },
    });
    await tx.project.update({
      where: { id: app.projectId },
      data: { recruitStatus: "closed", dealStatus: "awaiting_contract" },
    });

    await notifyMany(tx, [
      draftAccepted({ freelancerId: app.freelancerId, projectTitle: app.project.title }),
      ...others.map((o) => draftRejectedAuto({ freelancerId: o.freelancerId, projectTitle: app.project.title })),
    ]);

    return { applicationId: app.id, autoRejected: others.length };
  });
}

/** 건물주 직접 거절 (B-19, B-24 ④) */
export async function rejectApplication(applicationId: string, clientId: string) {
  return prisma.$transaction(async (tx) => {
    const app = await tx.application.findUnique({
      where: { id: applicationId },
      include: { project: { select: { title: true, clientId: true, deletedAt: true } } },
    });

    if (!app || app.project.deletedAt) throw new ApiError(404, "NOT_FOUND", "지원서를 찾을 수 없어요");
    if (app.project.clientId !== clientId) throw new ApiError(403, "FORBIDDEN", "내 프로젝트의 지원만 처리할 수 있어요");
    if (app.status !== "pending") throw new ApiError(409, "ALREADY_DECIDED", "이미 처리된 지원이에요");

    await tx.application.update({ where: { id: app.id }, data: { status: "rejected" } });
    await notifyMany(tx, [draftRejected({ freelancerId: app.freelancerId, projectTitle: app.project.title })]);

    return { applicationId: app.id };
  });
}

/**
 * 프로젝트 취소 (B-32). 계약 체결(양측 서명) 이전에만 가능 — 이후는 환불 흐름.
 * 미처리 지원은 거절 처리하고 지원자 전원(수락된 사람 포함)에게 알린다.
 */
export async function cancelProject(projectId: string, clientId: string) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.findUnique({
      where: { id: projectId },
      include: { contract: { select: { clientSignedAt: true, freelancerSignedAt: true } } },
    });

    if (!project || project.deletedAt) throw new ApiError(404, "NOT_FOUND", "프로젝트를 찾을 수 없어요");
    if (project.clientId !== clientId) throw new ApiError(403, "FORBIDDEN", "내 프로젝트만 취소할 수 있어요");
    if (project.dealStatus === "cancelled") throw new ApiError(409, "ALREADY_CANCELLED", "이미 취소된 프로젝트예요");

    const signed = project.contract?.clientSignedAt && project.contract?.freelancerSignedAt;
    if (signed || (project.dealStatus && project.dealStatus !== "awaiting_contract")) {
      throw new ApiError(409, "CONTRACT_SIGNED", "계약이 체결된 뒤에는 취소할 수 없어요. 환불 절차를 이용해 주세요");
    }

    const apps = await tx.application.findMany({
      where: { projectId, status: { in: ["pending", "accepted"] } },
      select: { id: true, freelancerId: true, status: true },
    });

    await tx.application.updateMany({
      where: { id: { in: apps.filter((a) => a.status === "pending").map((a) => a.id) } },
      data: { status: "rejected" },
    });
    await tx.project.update({
      where: { id: projectId },
      data: { recruitStatus: "closed", dealStatus: "cancelled" },
    });
    await notifyMany(
      tx,
      apps.map((a) => draftProjectCancelled({ freelancerId: a.freelancerId, projectTitle: project.title }))
    );

    return { projectId, notified: apps.length };
  });
}

/**
 * 소프트 삭제 (B-09). 거래가 시작된 프로젝트는 지울 수 없다 — 취소를 거쳐야 한다.
 * 미처리 지원자에게는 취소와 같은 알림을 보낸다.
 */
export async function softDeleteProject(projectId: string, clientId: string) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.findUnique({ where: { id: projectId } });

    if (!project || project.deletedAt) throw new ApiError(404, "NOT_FOUND", "프로젝트를 찾을 수 없어요");
    if (project.clientId !== clientId) throw new ApiError(403, "FORBIDDEN", "내 프로젝트만 삭제할 수 있어요");
    if (project.dealStatus && project.dealStatus !== "cancelled") {
      throw new ApiError(409, "IN_DEAL", "거래가 진행 중인 프로젝트는 삭제할 수 없어요. 먼저 취소해 주세요");
    }

    const pending = await tx.application.findMany({
      where: { projectId, status: "pending" },
      select: { id: true, freelancerId: true },
    });
    await tx.application.updateMany({
      where: { id: { in: pending.map((a) => a.id) } },
      data: { status: "rejected" },
    });
    await tx.project.update({
      where: { id: projectId },
      data: { deletedAt: new Date(), recruitStatus: "closed" },
    });
    await notifyMany(
      tx,
      pending.map((a) => draftProjectCancelled({ freelancerId: a.freelancerId, projectTitle: project.title }))
    );

    return { projectId };
  });
}
