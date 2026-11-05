import "server-only";

import { prisma } from "@/lib/server/db";
import { ApiError } from "@/lib/server/api";
import { findDictItem } from "@/lib/server/scope/dictionary";
import { ruleBasedAnalysis } from "@/lib/server/scope/fallback";
import { buildUserMessage, SYSTEM_PROMPT } from "@/lib/server/scope/prompt";
import { scopeAnalysisOut, type ScopeAnalysisOut } from "@/lib/server/scope/schema";

/**
 * AI 공정 분해 (A-01, docs/06).
 * LLM 호출 → zod 검증 → 서버 재검증(합계·범위·ETC 비율) → 실패 시 규칙 폴백 → ScopeAnalysis + ScopeItem 저장.
 * 프로젝트당 재분석 가능. 최신 분석이 리포트가 된다.
 */

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

export async function analyzeProject(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { skills: { select: { skill: { select: { name: true } } } } },
  });
  if (!project || project.deletedAt) throw new ApiError(404, "NOT_FOUND", "프로젝트를 찾을 수 없어요");
  if (project.description.trim().length < 20) {
    throw new ApiError(422, "DESCRIPTION_TOO_SHORT", "어디가, 어떤 증상인지 20자 이상 적어 주셔야 분해할 수 있어요");
  }

  const input = {
    title: project.title,
    description: project.description,
    category: project.category,
    skills: project.skills.map((s) => s.skill.name),
    budget: project.budget,
  };

  let result: ScopeAnalysisOut | null = null;
  let model = "rule";

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      result = await callLlm(input);
      model = MODEL;
    } catch (e) {
      console.warn("[scope] LLM 분해 실패 → 규칙 폴백:", e instanceof Error ? e.message : e);
    }
  }
  if (!result) result = ruleBasedAnalysis(input);

  // 서버 검증 — 합계는 항상 재계산해 덮어쓴다 (AI 가 더한 숫자를 믿지 않는다)
  const total = result.items.reduce((s, i) => s + i.estimate, 0);

  const analysis = await prisma.scopeAnalysis.create({
    data: {
      projectId,
      totalEstimate: total,
      model,
      assumptions: result.assumptions,
      missingInfo: result.missingInfo,
      confidence: result.confidence,
      items: {
        create: result.items.map((it, i) => ({
          sortOrder: i,
          name: it.name,
          description: it.description,
          estimate: it.estimate,
          rationale: flagOutOfRange(project.category, it) + it.rationale,
          code: it.code,
          quantity: it.quantity,
          unit: it.unit,
          conditional: it.conditional,
        })),
      },
    },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });

  return analysis;
}

/** 사전 코드인데 수량 × 상한 × 1.5 를 넘으면 "확인 필요" 표시를 근거 앞에 붙인다 (docs/06 4장) */
function flagOutOfRange(category: string, it: ScopeAnalysisOut["items"][number]) {
  const d = findDictItem(category, it.code);
  if (!d) return "";
  if (it.estimate > it.quantity * d.high * 1.5) return "[확인 필요: 사전 단가 범위 초과] ";
  return "";
}

async function callLlm(input: Parameters<typeof buildUserMessage>[0]): Promise<ScopeAnalysisOut> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserMessage(input) }],
    }),
    signal: AbortSignal.timeout(40_000),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}`);

  const json = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = json.content?.find((c) => c.type === "text")?.text ?? "";
  const parsed = scopeAnalysisOut.parse(JSON.parse(extractJson(text)));

  // ETC 비율 1/3 초과면 폴백 (재요청은 비용 대비 효과가 낮아 생략)
  const etc = parsed.items.filter((i) => i.code === "ETC").length;
  if (etc * 3 > parsed.items.length) throw new Error("ETC 비율 초과");

  return parsed;
}

function extractJson(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("JSON 없음");
  return text.slice(start, end + 1);
}
