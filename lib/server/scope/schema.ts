import { z } from "zod";

/** AI 출력 스키마 (docs/06 4장). AI 를 믿지 않는다 — 통과한 것만 저장한다. */

export const scopeItemOut = z.object({
  code: z.string().min(2).max(10), // 사전 코드 또는 "ETC"
  name: z.string().trim().min(2).max(40),
  description: z.string().trim().min(5).max(300),
  quantity: z.number().positive(),
  unit: z.string().trim().min(1).max(10),
  estimate: z.number().int().min(10_000),
  rationale: z.string().trim().min(10).max(500),
  conditional: z.boolean().default(false),
});

export const scopeAnalysisOut = z.object({
  items: z.array(scopeItemOut).min(2).max(12),
  assumptions: z.array(z.string().max(120)).max(8).default([]),
  totalEstimate: z.number().int(),
  confidence: z.enum(["low", "medium", "high"]).default("medium"),
  missingInfo: z.array(z.string().max(80)).max(5).default([]),
});

export type ScopeItemOut = z.infer<typeof scopeItemOut>;
export type ScopeAnalysisOut = z.infer<typeof scopeAnalysisOut>;

/** 전문가가 공정표를 고칠 때 (docs/06 5장). 행 전체를 통째로 받는다 — 부분 갱신은 화면에 없다. */
export const scopeEditSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().optional(), // 없으면 새 행
        name: z.string().trim().min(2, "공정 이름을 2자 이상 적어 주세요").max(40),
        description: z.string().trim().min(5, "무엇을 하는지 5자 이상 적어 주세요").max(300),
        quantity: z.coerce.number().positive().optional(),
        unit: z.string().trim().max(10).optional(),
        estimate: z.coerce.number().int().min(10_000, "금액은 1만원 이상이어야 해요"),
        reason: z.string().trim().max(200).optional(), // 고친 이유 — rationale 앞에 붙는다
        conditional: z.boolean().optional(),
      })
    )
    .min(1, "공정이 하나 이상 있어야 해요")
    .max(20),
});
