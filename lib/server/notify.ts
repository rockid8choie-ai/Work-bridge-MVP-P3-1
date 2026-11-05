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
  // ── 거래 단계 (RFP 8.3 선택 트리거 + A-03 ~ A-12) ──
  offer_made: "offer_made", // 건물주 금액 제시 → 전문가
  offer_agreed: "offer_agreed", // 전문가 동의 → 건물주
  offer_declined: "offer_declined", // 전문가 거부 → 건물주
  contract_signed: "contract_signed", // 상대가 서명 / 체결 → 양측
  payment_paid: "payment_paid", // 에스크로 결제 완료 → 양측
  milestone_submitted: "milestone_submitted", // 납품 요청 → 건물주
  milestone_approved: "milestone_approved", // 완료 승인·지급 → 전문가
  project_completed: "project_completed", // 전 공정 승인 → 양측 (리뷰 요청)
  review_received: "review_received", // 리뷰 도착 → 대상
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

/* ── 거래 단계 ── 모두 거래 화면(/projects/[id]/deal)으로 보낸다 */

export function draftOfferMade(p: { freelancerId: string; projectId: string; projectTitle: string; amount: number }): Draft {
  return {
    userId: p.freelancerId,
    type: "offer_made",
    title: `건물주가 ${p.amount.toLocaleString("ko-KR")}원을 제시했어요`,
    body: `${p.projectTitle} — 범위표를 확인하고 동의 또는 거부해 주세요`,
    link: `/projects/${p.projectId}/deal`,
  };
}

export function draftOfferAgreed(p: { clientId: string; projectId: string; projectTitle: string }): Draft {
  return {
    userId: p.clientId,
    type: "offer_agreed",
    title: "전문가가 금액에 동의했어요",
    body: `${p.projectTitle} — 계약서가 만들어졌어요. 서명해 주세요`,
    link: `/projects/${p.projectId}/deal`,
  };
}

export function draftOfferDeclined(p: { clientId: string; projectId: string; projectTitle: string }): Draft {
  return {
    userId: p.clientId,
    type: "offer_declined",
    title: "전문가가 금액을 거부했어요",
    body: `${p.projectTitle} — 공사가 다시 모집 중으로 돌아갔어요`,
    link: `/projects/${p.projectId}`,
  };
}

export function draftContractSigned(p: { userId: string; projectId: string; projectTitle: string; sealed: boolean }): Draft {
  return {
    userId: p.userId,
    type: "contract_signed",
    title: p.sealed ? "계약이 체결됐어요" : "상대방이 계약서에 서명했어요",
    body: p.sealed ? `${p.projectTitle} — 다음은 에스크로 선결제예요` : `${p.projectTitle} — 내 서명이 남았어요`,
    link: `/projects/${p.projectId}/deal`,
  };
}

export function draftPaymentPaid(p: { userId: string; projectId: string; projectTitle: string; amount: number }): Draft {
  return {
    userId: p.userId,
    type: "payment_paid",
    title: `에스크로 결제 완료 · ${p.amount.toLocaleString("ko-KR")}원`,
    body: `${p.projectTitle} — 작업을 시작할 수 있어요`,
    link: `/projects/${p.projectId}/deal`,
  };
}

export function draftMilestoneSubmitted(p: { clientId: string; projectId: string; projectTitle: string; milestone: string }): Draft {
  return {
    userId: p.clientId,
    type: "milestone_submitted",
    title: `"${p.milestone}" 완료 승인 요청`,
    body: `${p.projectTitle} — 확인 후 승인하면 그 금액이 지급돼요`,
    link: `/projects/${p.projectId}/deal`,
  };
}

export function draftMilestoneApproved(p: { freelancerId: string; projectId: string; projectTitle: string; milestone: string; net: number }): Draft {
  return {
    userId: p.freelancerId,
    type: "milestone_approved",
    title: `"${p.milestone}" 승인 · ${p.net.toLocaleString("ko-KR")}원 지급`,
    body: `${p.projectTitle} — 수수료 10% 차감 후 금액이에요`,
    link: `/projects/${p.projectId}/deal`,
  };
}

export function draftProjectCompleted(p: { userId: string; projectId: string; projectTitle: string }): Draft {
  return {
    userId: p.userId,
    type: "project_completed",
    title: "공사가 완료됐어요",
    body: `${p.projectTitle} — 상대방을 평가해 주세요`,
    link: `/projects/${p.projectId}/deal`,
  };
}

export function draftReviewReceived(p: { userId: string; projectId: string; projectTitle: string; rating: number }): Draft {
  return {
    userId: p.userId,
    type: "review_received",
    title: `리뷰가 도착했어요 · ${"★".repeat(p.rating)}`,
    body: p.projectTitle,
    link: `/projects/${p.projectId}/deal`,
  };
}
