import { z } from "zod";

/** 지원서 (B-18) — 자기소개 · 예상 단가 · 예상 기간 */
export const applySchema = z.object({
  coverLetter: z
    .string()
    .trim()
    .min(20, "어떻게 진행할지 20자 이상 적어 주세요")
    .max(2000, "2000자 이내로 적어 주세요"),
  proposedAmount: z.coerce
    .number()
    .int()
    .min(10_000, "예상 금액은 1만원 이상이어야 해요")
    .max(1_000_000_000),
  proposedDays: z.coerce
    .number()
    .int()
    .min(1, "예상 기간은 1일 이상이어야 해요")
    .max(365, "예상 기간은 1년 이내여야 해요"),
});

/** 지원자 처리 (B-19) */
export const decisionSchema = z.object({
  action: z.enum(["accept", "reject"]),
});

/** 알림 읽음 처리 (B-25, B-26) — id 하나 또는 전부 */
export const readNotificationSchema = z
  .object({
    id: z.string().min(1).optional(),
    all: z.boolean().optional(),
  })
  .refine((v) => v.id || v.all, { message: "읽음 처리할 대상을 지정해 주세요" });
