/** 화면에서 쓰는 상태 문구. 서버·클라이언트 공용이라 server-only 를 걸지 않는다. */

export const RECRUIT_LABEL = {
  scheduled: "모집 예정",
  open: "모집 중",
  closed: "모집 마감",
} as const;

export const RECRUIT_STYLE = {
  scheduled: "bg-warn-50 text-warn-700",
  open: "bg-accent-50 text-accent-600",
  closed: "bg-canvas-50 text-ink-500",
} as const;

/** 거래 단계는 내부 화면(내 프로젝트 · 내 지원 현황 · 계약서)에서만 보인다 (B-17, B-33) */
export const DEAL_LABEL = {
  awaiting_contract: "계약 대기",
  awaiting_payment: "결제 대기",
  in_progress: "작업 중",
  completed: "완료",
  cancelled: "취소",
} as const;

export const DEAL_STYLE = {
  awaiting_contract: "bg-line-100 text-ink-700",
  awaiting_payment: "bg-warn-50 text-warn-700",
  in_progress: "bg-accent-50 text-accent-600",
  completed: "bg-ok-50 text-ok-700",
  cancelled: "bg-canvas-50 text-ink-500",
} as const;

export const APPLICATION_LABEL = {
  pending: "검토중",
  accepted: "수락",
  rejected: "거절",
} as const;

export const APPLICATION_STYLE = {
  pending: "bg-warn-50 text-warn-700",
  accepted: "bg-ok-50 text-ok-700",
  rejected: "bg-canvas-50 text-ink-500",
} as const;

export const OFFER_LABEL = {
  pending: "응답 대기",
  agreed: "합의 완료",
  declined: "거부",
} as const;

export const MILESTONE_LABEL = {
  todo: "대기",
  in_progress: "작업 중",
  submitted: "승인 요청",
  approved: "승인·지급",
} as const;

export const MILESTONE_STYLE = {
  todo: "bg-canvas-100 text-ink-500",
  in_progress: "bg-accent-50 text-accent-600",
  submitted: "bg-warn-50 text-warn-700",
  approved: "bg-ok-50 text-ok-700",
} as const;

export const PAYMENT_LABEL = {
  pending: "결제 대기",
  paid: "에스크로 보관 중",
  partially_settled: "일부 지급",
  settled: "지급 완료",
  refunded: "환불",
} as const;

/** 거래 진행 바 — 거래 화면 상단 (내부 화면) */
export const DEAL_STEPS = [
  { key: "awaiting_contract", label: "범위·금액 합의" },
  { key: "contract", label: "계약 서명" },
  { key: "awaiting_payment", label: "에스크로 결제" },
  { key: "in_progress", label: "작업·단계 승인" },
  { key: "completed", label: "완료·평가" },
] as const;

export const PROJECT_CATEGORIES = [
  "누수·방수",
  "전기·조명",
  "설비·배관",
  "외벽·도장",
  "인테리어·목공",
  "소방·안전",
  "공조·환기",
  "기타",
] as const;

export function won(n: number | null | undefined) {
  return n == null ? "미정" : `${n.toLocaleString("ko-KR")}원`;
}

export function dateKo(d: Date | string) {
  return new Date(d).toLocaleDateString("ko-KR");
}
