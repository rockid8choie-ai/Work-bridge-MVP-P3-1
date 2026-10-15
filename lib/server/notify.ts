import "server-only";

import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * 인앱 알림 (B-24 ~ B-26).
 * 알림은 항상 상태 변경과 같은 트랜잭션 안에서 만든다 — 상태만 바뀌고 알림이 빠지는 일을 막기 위함.
 * 그래서 모든 함수가 tx(또는 prisma)를 받는다.
 */

type Db = PrismaClient | Prisma.TransactionClient;

export const NOTIFICATION_TYPES = {
  application_received: "application_received", // 전문가 지원 → 건물주
  application_accepted: "application_accepted", // 수락 → 해당 전문가
  application_rejected_auto: "application_rejected_auto", // 타 지원 수락으로 자동 거절 → 전문가
  application_rejected: "application_rejected", // 건물주 직접 거절 → 전문가
  recruit_closed: "recruit_closed", // 모집 마감 → 지원자 전원
  project_cancelled: "project_cancelled", // 프로젝트 취소 → 지원자 전원
} as const;

export type NotificationType = keyof typeof NOTIFICATION_TYPES;

type Draft = {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link: string;
};

export function notifyMany(db: Db, drafts: Draft[]) {
  if (drafts.length === 0) return Promise.resolve({ count: 0 });
  return db.notification.createMany({ data: drafts });
}

/* ── 문구 템플릿 ── 한곳에 모아두면 알림 목록의 톤이 흔들리지 않는다 */

export function draftApplicationReceived(p: {
  clientId: string;
  projectId: string;
  projectTitle: string;
  freelancerName: string;
}): Draft {
  return {
    userId: p.clientId,
    type: "application_received",
    title: `${p.freelancerName} 전문가가 지원했어요`,
    body: p.projectTitle,
    link: `/projects/${p.projectId}/applicants`,
  };
}

export function draftAccepted(p: { freelancerId: string; projectTitle: string }): Draft {
  return {
    userId: p.freelancerId,
    type: "application_accepted",
    title: "지원이 수락됐어요",
    body: `${p.projectTitle} — 다음 단계는 범위와 금액 합의입니다`,
    link: "/me/applications",
  };
}

export function draftRejectedAuto(p: { freelancerId: string; projectTitle: string }): Draft {
  return {
    userId: p.freelancerId,
    type: "application_rejected_auto",
    title: "다른 전문가가 선정됐어요",
    body: p.projectTitle,
    link: "/me/applications",
  };
}

export function draftRejected(p: { freelancerId: string; projectTitle: string }): Draft {
  return {
    userId: p.freelancerId,
    type: "application_rejected",
    title: "지원이 거절됐어요",
    body: p.projectTitle,
    link: "/me/applications",
  };
}

export function draftRecruitClosed(p: { freelancerId: string; projectTitle: string }): Draft {
  return {
    userId: p.freelancerId,
    type: "recruit_closed",
    title: "모집이 마감됐어요",
    body: p.projectTitle,
    link: "/me/applications",
  };
}

export function draftProjectCancelled(p: { freelancerId: string; projectTitle: string }): Draft {
  return {
    userId: p.freelancerId,
    type: "project_cancelled",
    title: "프로젝트가 취소됐어요",
    body: p.projectTitle,
    link: "/me/applications",
  };
}
