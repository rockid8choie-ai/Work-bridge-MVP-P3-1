/**
 * 히어로 오른쪽 제품 모형 — 범위표 카드 + 승인 요청 + 정산 진행. 전부 마크업·CSS, 이미지 없음 (docs/11 6장).
 * 수치는 예시다. 실제 데이터처럼 보이지 않도록 카드 하단에 "예시"를 표기한다.
 */
export default function HeroVisual() {
  const rows = [
    ["누수 원인 탐지", "150,000"],
    ["천장 석고보드 철거", "180,000"],
    ["옥상 방수층 보수", "1,200,000"],
    ["천장 마감 복구", "420,000"],
  ];
  return (
    <div className="relative mx-auto h-[420px] w-full max-w-[520px] select-none sm:h-[480px]" aria-hidden>
      {/* 뒤 글로우 */}
      <div className="absolute left-1/2 top-1/2 size-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-500/25 blur-[90px]" />

      {/* 메인: 범위표 */}
      <div className="float-a absolute left-0 top-10 w-[340px] rounded-[20px] border border-white/10 bg-white p-5 text-ink-900 shadow-3 sm:w-[380px]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-ink-400">범위표 · 옥상 누수 보수</p>
            <p className="mt-0.5 text-[15px] font-bold">작업 항목 4건</p>
          </div>
          <span className="chip bg-accent-50 text-accent-700">계약 범위 확정</span>
        </div>
        <ul className="mt-4 space-y-2">
          {rows.map(([t, p], i) => (
            <li key={t} className="flex items-center justify-between rounded-xl bg-canvas-50 px-3 py-2 text-[13px]">
              <span className="flex items-center gap-2.5">
                <span
                  className={`flex size-4 items-center justify-center rounded-md border-2 ${
                    i < 2 ? "border-accent-500 bg-accent-500 text-white" : "border-line-200 bg-paper"
                  }`}
                >
                  {i < 2 && (
                    <svg viewBox="0 0 12 12" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="m2.5 6.5 2.5 2.5 4.5-5" />
                    </svg>
                  )}
                </span>
                <span className={i < 2 ? "text-ink-500 line-through decoration-line-200" : "text-ink-900"}>{t}</span>
              </span>
              <span className="font-semibold tabular-nums text-ink-700">{p}원</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between border-t border-line-100 pt-3">
          <span className="text-[12px] text-ink-400">합계 · 예시</span>
          <span className="text-[17px] font-extrabold tracking-tight">1,950,000원</span>
        </div>
      </div>

      {/* 승인 요청 토스트 */}
      <div className="float-b absolute right-0 top-0 w-[240px] rounded-2xl border border-white/10 bg-white/95 p-4 text-ink-900 shadow-3 backdrop-blur sm:right-2">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-ink-900 text-[12px] font-bold text-white">박</span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold">2단계 완료 · 승인 요청</p>
            <p className="text-[11px] text-ink-400">방수층 보수 · 방금</p>
          </div>
        </div>
        <div className="mt-3 flex gap-1.5">
          <span className="btn-primary flex-1 py-1.5 text-[12px]">승인하고 지급</span>
          <span className="btn-secondary px-3 py-1.5 text-[12px]">보류</span>
        </div>
      </div>

      {/* 정산 진행 */}
      <div className="float-c absolute bottom-0 right-6 w-[250px] rounded-2xl border border-white/10 bg-white p-4 text-ink-900 shadow-3 sm:right-10">
        <div className="flex items-center justify-between text-[12px]">
          <span className="font-semibold text-ink-500">단계별 정산</span>
          <span className="font-bold text-ok-600">60% 지급</span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-line-100">
          <div className="h-full w-[60%] rounded-full bg-gradient-to-r from-accent-500 to-accent-700" />
        </div>
        <div className="mt-2.5 flex justify-between text-[11px] text-ink-400">
          <span>1·2단계 완료</span>
          <span className="font-semibold text-ink-700">1,170,000원</span>
        </div>
      </div>
    </div>
  );
}
