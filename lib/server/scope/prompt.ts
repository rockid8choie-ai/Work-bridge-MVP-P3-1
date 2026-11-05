import "server-only";

import { dictionaryFor } from "@/lib/server/scope/dictionary";

/** 시스템 프롬프트 + 사용자 메시지 (docs/06 3장) */

export const SYSTEM_PROMPT = `너는 건물 유지보수 견적 보조원이다. 건물주가 적은 공사 설명을 읽고, 아래 공정 사전에서만 공정을 골라 항목별 범위표 초안을 만든다.
사전에 없는 작업이 꼭 필요하면 code 를 "ETC" 로 하고 name 을 직접 쓰되, 전체 항목의 1/3 을 넘기지 않는다.

규칙
1. 원인이 불확실하면 첫 공정은 반드시 사전의 진단 공정이다. 진단 결과에 따라 달라질 공정은 conditional: true 로 표시한다.
2. 각 공정의 estimate 는 (수량 × 사전 단가 범위 안의 단가) 로 정한다. 범위를 벗어나야 하면 rationale 에 이유를 쓴다.
3. rationale 에는 (a) 설명문의 어떤 문장에서 이 공정이 필요하다고 판단했는지 (b) 수량 가정 (c) 단가 근거 를 쓴다.
4. 수량을 알 수 없으면 assumptions 에 가정을 적는다 (예: "화장실 천장 약 4㎡ 가정").
5. 예산에 맞추지 않는다. 예산보다 크면 그대로 쓴다.
6. 공정은 시공 순서대로 정렬한다. 2개 이상 12개 이하.
7. missingInfo 에는 더 물어봐야 정확해지는 정보를 적는다 (예: "면적", "층수", "사진").
8. 금액은 원 단위 정수. 모든 문장은 한국어.
9. JSON 만 출력한다. 설명·마크다운 금지.

출력 형식
{"items":[{"code":"WP-01","name":"...","description":"...","quantity":1,"unit":"회","estimate":180000,"rationale":"...","conditional":false}],"assumptions":["..."],"totalEstimate":0,"confidence":"low|medium|high","missingInfo":["..."]}`;

export function buildUserMessage(p: {
  title: string;
  description: string;
  category: string;
  skills: string[];
  budget: number | null;
}) {
  const dict = dictionaryFor(p.category).map((d) => ({ code: d.code, name: d.name, unit: d.unit, low: d.low, high: d.high, qty: d.qty, note: d.note, diagnostic: d.diagnostic }));
  return [
    `# 공사`,
    `제목: ${p.title}`,
    `카테고리: ${p.category}`,
    `필요 전문분야: ${p.skills.join(", ") || "미지정"}`,
    `건물주 예산: ${p.budget == null ? "미정" : `${p.budget.toLocaleString("ko-KR")}원 (참고용, 맞추지 말 것)`}`,
    ``,
    `# 설명`,
    p.description,
    ``,
    `# 공정 사전 (${p.category})`,
    JSON.stringify(dict),
  ].join("\n");
}
