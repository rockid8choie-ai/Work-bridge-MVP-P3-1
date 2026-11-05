import "server-only";

import { dictionaryFor, type DictItem } from "@/lib/server/scope/dictionary";
import type { ScopeAnalysisOut } from "@/lib/server/scope/schema";

/**
 * 규칙 기반 폴백 (docs/06 4장) — LLM 키가 없거나 호출·검증이 실패해도 서비스가 멈추지 않게 한다.
 * 설명문에서 사전의 keywords 를 찾아 공정을 고르고, 못 찾으면 카테고리 기본 세트(진단 + 대표 공정)를 중간값으로 채운다.
 * 결과는 model: "rule" 로 저장돼 리포트에 "자동 생성 초안" 안내가 뜬다.
 */
export function ruleBasedAnalysis(input: { title: string; description: string; category: string }): ScopeAnalysisOut {
  const text = `${input.title}\n${input.description}`;
  const dict = dictionaryFor(input.category);

  const matched = dict.filter((d) => d.keywords?.some((k) => text.includes(k)));
  const diagnostic = dict.find((d) => d.diagnostic);

  let picked: DictItem[] = [];
  if (diagnostic) picked.push(diagnostic);
  for (const m of matched) if (!picked.includes(m)) picked.push(m);

  // 키워드로 2개 미만이면 대표 공정으로 채운다 (진단 + 사전 앞쪽 2~3개)
  if (picked.length < 2) {
    for (const d of dict) {
      if (picked.length >= 4) break;
      if (!picked.includes(d)) picked.push(d);
    }
  }
  picked = picked.slice(0, 8);

  const items = picked.map((d) => {
    const mid = Math.round((d.low + d.high) / 2 / 10_000) * 10_000;
    const estimate = Math.max(10_000, mid * d.qty);
    const hit = d.keywords?.filter((k) => text.includes(k)) ?? [];
    return {
      code: d.code,
      name: d.name,
      description: d.note ?? `${d.name} (${d.qty}${d.unit} 기준)`,
      quantity: d.qty,
      unit: d.unit,
      estimate,
      rationale:
        (hit.length > 0 ? `설명문의 "${hit[0]}" 에서 필요하다고 판단. ` : d.diagnostic ? "원인이 확정되지 않아 진단을 먼저 둔다. " : "카테고리 기본 공정. ") +
        `수량 ${d.qty}${d.unit} 가정, 단가 ${d.low.toLocaleString("ko-KR")}~${d.high.toLocaleString("ko-KR")}원/${d.unit} 의 중간값 적용.`,
      conditional: !d.diagnostic && Boolean(diagnostic),
    };
  });

  return {
    items,
    assumptions: ["수량은 소액 보수 기준 기본값으로 가정했습니다. 현장 실측 후 전문가가 조정합니다."],
    totalEstimate: items.reduce((s, i) => s + i.estimate, 0),
    confidence: "low",
    missingInfo: ["면적·개소 수", "사진", "발생 시점"],
  };
}
