import "server-only";

import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/server/db";
import { ApiError } from "@/lib/server/api";
import {
  draftContractSigned,
  draftMilestoneApproved,
  draftMilestoneSubmitted,
  draftOfferAgreed,
  draftOfferDeclined,
  draftOfferMade,
  draftProjectCompleted,
  notifyMany,
} from "@/lib/server/notify";

/**
 * 거래 단계 (A-03 ~ A-06, A-10, A-11).
 * 금액 합의 → 계약서 생성 → 양측 서명(체결) → [결제: payments.ts] → 납품 요청 → 완료 승인(정산) → 완료.
 * 상태 전이와 알림은 항상 한 트랜잭션. 범위표는 체결 시점에 사본(scopeSnapshot)으로 얼어붙는다.
 */

export const FEE_RATE = Number(process.env.PLATFORM_FEE_RATE ?? "0.10");

export type SnapshotItem = {
  sortOrder: number;
  name: string;
  description: string;
  estimate: number;
  rationale: string;
  quantity: number | null;
  unit: string | null;
  conditional: boolean;
  editedBy: string | null;
  scopeItemId: string | null;
};

/** 프로젝트의 거래 상대(수락된 지원)와 최신 범위표를 한 번에 읽는다 — 거래 화면·API 공용 */
export async function loadDeal(projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    include: {
      client: { select: { id: true, name: true, email: true, clientProfile: { select: { buildingName: true, region: true } } } },
      applications: {
        where: { status: "accepted" },
        take: 1,
        include: { freelancer: { select: { id: true, name: true, email: true, vendorProfile: { select: { mainCategory: true } } } } },
      },
      analyses: { orderBy: { createdAt: "desc" }, take: 1, include: { items: { orderBy: { sortOrder: "asc" } } } },
      contract: {
        include: {
          milestones: { orderBy: { sortOrder: "asc" } },
          payments: { orderBy: { createdAt: "desc" } },
        },
      },
      reviews: { select: { id: true, direction: true, authorId: true, rating: true, comment: true, tags: true, createdAt: true } },
    },
  });
  if (!project) throw new ApiError(404, "NOT_FOUND", "프로젝트를 찾을 수 없어요");
  return { project, application: project.applications[0] ?? null, analysis: project.analyses[0] ?? null };
}

/** 서명 대상 문서의 지문 — 범위 사본·금액·기간이 하나라도 바뀌면 값이 달라진다. 계약서 하단에 표시해 "무엇에 서명했는지" 를 고정한다. */
export function hashDocument(doc: { agreedAmount: number; durationDays: number; scopeSnapshot: SnapshotItem[] }) {
  return createHash("sha256").update(JSON.stringify(doc)).digest("hex");
}

export type SignatureInput = { name: string; signature: string };

export function assertParty(deal: Awaited<ReturnType<typeof loadDeal>>, userId: string) {
  const isClient = deal.project.clientId === userId;
  const isFreelancer = deal.application?.freelancerId === userId;
  if (!isClient && !isFreelancer) throw new ApiError(403, "FORBIDDEN", "이 거래의 당사자만 볼 수 있어요");
  return { isClient, isFreelancer };
}

/** 범위표 → 계약 사본. 분석이 없으면 합의 금액 한 줄짜리 범위표를 만든다. */
function buildSnapshot(deal: Awaited<ReturnType<typeof loadDeal>>, agreedAmount: number): SnapshotItem[] {
  const items = deal.analysis?.items ?? [];
  if (items.length === 0) {
    return [
      {
        sortOrder: 0,
        name: "전체 공사",
        description: deal.project.description.slice(0, 300),
        estimate: agreedAmount,
        rationale: "AI 공정 분해 없이 합의한 금액. 단일 공정으로 계약·정산한다.",
        quantity: 1,
        unit: "식",
        conditional: false,
        editedBy: null,
        scopeItemId: null,
      },
    ];
  }
  // 합의 금액이 범위표 합계와 다르면 비율로 나눠 담는다 — 합계가 계약 금액과 같아야 정산이 맞는다
  const total = items.reduce((s, i) => s + i.estimate, 0);
  let acc = 0;
  return items.map((it, idx) => {
    const last = idx === items.length - 1;
    const est = last ? agreedAmount - acc : Math.round((it.estimate / total) * agreedAmount);
    acc += est;
    return {
      sortOrder: it.sortOrder,
      name: it.name,
      description: it.description,
      estimate: est,
      rationale: it.rationale,
      quantity: it.quantity,
      unit: it.unit,
      conditional: it.conditional,
      editedBy: it.editedBy,
      scopeItemId: it.id,
    };
  });
}

/** A-03 ① 건물주가 금액 제시 (D-05: 1회 제시) */
export async function makeOffer(projectId: string, clientId: string, input: { amount: number; days: number; message?: string }) {
  return prisma.$transaction(async (tx) => {
    const deal = await loadDeal(projectId);
    if (deal.project.clientId !== clientId) throw new ApiError(403, "FORBIDDEN", "내 공사만 제시할 수 있어요");
    if (deal.project.dealStatus !== "awaiting_contract" || !deal.application) {
      throw new ApiError(409, "NOT_AWAITING", "지원자를 수락한 뒤, 계약 전 단계에서만 금액을 제시할 수 있어요");
    }
    if (deal.application.offerStatus === "agreed" || deal.project.contract) {
      throw new ApiError(409, "ALREADY_AGREED", "이미 합의가 끝났어요");
    }
    if (deal.application.offerStatus === "pending") {
      throw new ApiError(409, "OFFER_PENDING", "전문가 응답을 기다리는 중이에요");
    }

    const app = await tx.application.update({
      where: { id: deal.application.id },
      data: {
        offerAmount: input.amount,
        offerDays: input.days,
        offerMessage: input.message ?? null,
        offerStatus: "pending",
        offeredAt: new Date(),
        offerDecidedAt: null,
      },
      select: { id: true, offerAmount: true, offerStatus: true },
    });

    await notifyMany(tx, [
      draftOfferMade({ freelancerId: deal.application.freelancerId, projectId, projectTitle: deal.project.title, amount: input.amount }),
    ]);
    return app;
  });
}

/** A-03 ② / A-04 — 전문가 동의(→ 계약서 자동 생성) 또는 거부(→ 지원 거절 + 모집 복귀, D-06 다른 지원자 복구 없음) */
export async function decideOffer(projectId: string, freelancerId: string, decision: "agree" | "decline") {
  return prisma.$transaction(async (tx) => {
    const deal = await loadDeal(projectId);
    if (deal.application?.freelancerId !== freelancerId) throw new ApiError(403, "FORBIDDEN", "이 공사의 선정 전문가만 응답할 수 있어요");
    if (deal.application.offerStatus !== "pending" || deal.application.offerAmount == null) {
      throw new ApiError(409, "NO_PENDING_OFFER", "응답할 제시 금액이 없어요");
    }

    const now = new Date();
    if (decision === "decline") {
      await tx.application.update({
        where: { id: deal.application.id },
        data: { status: "rejected", offerStatus: "declined", offerDecidedAt: now },
      });
      // 모집 복귀 — 마감일이 지났으면 syncRecruitStatuses 가 다시 마감한다
      await tx.project.update({
        where: { id: projectId },
        data: { dealStatus: null, recruitStatus: deal.project.deadlineAt > now ? "open" : "closed" },
      });
      await notifyMany(tx, [draftOfferDeclined({ clientId: deal.project.clientId, projectId, projectTitle: deal.project.title })]);
      return { decision, contractId: null };
    }

    // 동의 → 계약서 자동 생성 (A-05). 범위 조항 = 최신 범위표 사본.
    const agreedAmount = deal.application.offerAmount;
    const snapshot = buildSnapshot(deal, agreedAmount);

    await tx.application.update({
      where: { id: deal.application.id },
      data: { offerStatus: "agreed", offerDecidedAt: now },
    });
    const durationDays = deal.application.offerDays ?? deal.application.proposedDays;
    const contract = await tx.contract.create({
      data: {
        projectId,
        applicationId: deal.application.id,
        agreedAmount,
        durationDays,
        scopeSnapshot: snapshot as unknown as Prisma.InputJsonValue,
        documentHash: hashDocument({ agreedAmount, durationDays, scopeSnapshot: snapshot }),
      },
      select: { id: true },
    });
    await notifyMany(tx, [draftOfferAgreed({ clientId: deal.project.clientId, projectId, projectTitle: deal.project.title })]);
    return { decision, contractId: contract.id };
  });
}

/** A-06 전자 서명 — 서명 패드 이미지 + 서명자 이름을 증적으로 남긴다. 양측이 모두 서명하면 체결: 마일스톤 생성 + awaiting_payment */
export async function signContract(projectId: string, userId: string, sig: SignatureInput) {
  return prisma.$transaction(async (tx) => {
    const deal = await loadDeal(projectId);
    const { isClient } = assertParty(deal, userId);
    const contract = deal.project.contract;
    if (!contract) throw new ApiError(409, "NO_CONTRACT", "아직 계약서가 없어요. 금액 합의가 먼저예요");
    if (contract.signedAt) throw new ApiError(409, "ALREADY_SEALED", "이미 체결된 계약이에요");

    const field = isClient ? "clientSignedAt" : "freelancerSignedAt";
    const nameField = isClient ? "clientSignName" : "freelancerSignName";
    const sigField = isClient ? "clientSignature" : "freelancerSignature";
    const now = new Date();

    // 내 서명란이 비어 있을 때만 쓴다 — 같은 사람이 두 번 눌러도 한 번만 기록된다
    const signed = await tx.contract.updateMany({
      where: { id: contract.id, [field]: null },
      data: { [field]: now, [nameField]: sig.name, [sigField]: sig.signature },
    });
    if (signed.count === 0) throw new ApiError(409, "ALREADY_SIGNED", "이미 서명했어요");

    // 체결 판정도 조건부 갱신으로 — 양측이 동시에 서명해도 정확히 한 요청만 체결 처리(마일스톤 생성)를 맡는다.
    // (11/5 셀프 리뷰: 이전 코드는 트랜잭션 밖에서 읽은 상대 서명 여부로 판단해 동시 서명 시 둘 다 '미체결'로 끝날 수 있었다)
    const sealedNow = await tx.contract.updateMany({
      where: { id: contract.id, clientSignedAt: { not: null }, freelancerSignedAt: { not: null }, signedAt: null },
      data: { signedAt: now },
    });
    const sealed = sealedNow.count === 1;

    const counterpart = isClient ? deal.application!.freelancerId : deal.project.clientId;

    if (sealed) {
      const snapshot = contract.scopeSnapshot as unknown as SnapshotItem[];
      await tx.milestone.createMany({
        data: snapshot.map((s, i) => ({
          contractId: contract.id,
          scopeItemId: s.scopeItemId,
          sortOrder: i,
          title: s.name,
          amount: s.estimate,
        })),
      });
      await tx.project.update({ where: { id: projectId }, data: { dealStatus: "awaiting_payment" } });
      await notifyMany(tx, [
        draftContractSigned({ userId: counterpart, projectId, projectTitle: deal.project.title, sealed: true }),
        draftContractSigned({ userId, projectId, projectTitle: deal.project.title, sealed: true }),
      ]);
    } else {
      await notifyMany(tx, [draftContractSigned({ userId: counterpart, projectId, projectTitle: deal.project.title, sealed: false })]);
    }

    return { sealed, signedAt: now };
  });
}

/** A-10 ① 납품 요청 — 전문가. 결제가 끝난(in_progress) 공사의 todo/in_progress 마일스톤만. */
export async function submitMilestone(milestoneId: string, freelancerId: string, note?: string) {
  return prisma.$transaction(async (tx) => {
    const m = await tx.milestone.findUnique({
      where: { id: milestoneId },
      include: { contract: { include: { project: { select: { id: true, title: true, clientId: true, dealStatus: true } }, application: { select: { freelancerId: true } } } } },
    });
    if (!m) throw new ApiError(404, "NOT_FOUND", "작업 단계를 찾을 수 없어요");
    if (m.contract.application.freelancerId !== freelancerId) throw new ApiError(403, "FORBIDDEN", "이 공사의 전문가만 납품 요청할 수 있어요");
    if (m.contract.project.dealStatus !== "in_progress") throw new ApiError(409, "NOT_IN_PROGRESS", "결제가 끝난 뒤에 작업을 시작할 수 있어요");
    if (m.status === "submitted") throw new ApiError(409, "ALREADY_SUBMITTED", "이미 승인을 기다리는 중이에요");
    if (m.status === "approved") throw new ApiError(409, "ALREADY_APPROVED", "이미 승인된 단계예요");

    await tx.milestone.update({ where: { id: m.id }, data: { status: "submitted", submittedAt: new Date(), note: note ?? null } });
    await notifyMany(tx, [
      draftMilestoneSubmitted({ clientId: m.contract.project.clientId, projectId: m.contract.project.id, projectTitle: m.contract.project.title, milestone: m.title }),
    ]);
    return { milestoneId: m.id, status: "submitted" as const };
  });
}

/** A-10 ② / A-11 완료 승인 — 건물주. 수수료 10% 차감 후 지급액 기록. 전부 승인되면 completed (C-01 단계별 정산). */
export async function approveMilestone(milestoneId: string, clientId: string) {
  return prisma.$transaction(async (tx) => {
    const m = await tx.milestone.findUnique({
      where: { id: milestoneId },
      include: { contract: { include: { project: { select: { id: true, title: true, clientId: true, dealStatus: true } }, application: { select: { freelancerId: true } }, payments: { where: { status: { in: ["paid", "partially_settled"] } }, take: 1 } } } },
    });
    if (!m) throw new ApiError(404, "NOT_FOUND", "작업 단계를 찾을 수 없어요");
    if (m.contract.project.clientId !== clientId) throw new ApiError(403, "FORBIDDEN", "이 공사의 건물주만 승인할 수 있어요");
    if (m.status !== "submitted") throw new ApiError(409, "NOT_SUBMITTED", "전문가가 납품 요청한 단계만 승인할 수 있어요");

    const fee = Math.round(m.amount * FEE_RATE);
    const net = m.amount - fee;
    const now = new Date();

    await tx.milestone.update({ where: { id: m.id }, data: { status: "approved", approvedAt: now, fee, net } });

    const remaining = await tx.milestone.count({ where: { contractId: m.contractId, status: { not: "approved" } } });
    const allDone = remaining === 0;

    const payment = m.contract.payments[0];
    if (payment) {
      await tx.payment.update({ where: { id: payment.id }, data: { status: allDone ? "settled" : "partially_settled" } });
    }

    const drafts = [
      draftMilestoneApproved({ freelancerId: m.contract.application.freelancerId, projectId: m.contract.project.id, projectTitle: m.contract.project.title, milestone: m.title, net }),
    ];
    if (allDone) {
      await tx.project.update({ where: { id: m.contract.project.id }, data: { dealStatus: "completed" } });
      drafts.push(
        draftProjectCompleted({ userId: m.contract.application.freelancerId, projectId: m.contract.project.id, projectTitle: m.contract.project.title }),
        draftProjectCompleted({ userId: clientId, projectId: m.contract.project.id, projectTitle: m.contract.project.title })
      );
    }
    await notifyMany(tx, drafts);

    return { milestoneId: m.id, fee, net, completed: allDone };
  });
}

export function feeOf(amount: number) {
  const fee = Math.round(amount * FEE_RATE);
  return { fee, net: amount - fee };
}

