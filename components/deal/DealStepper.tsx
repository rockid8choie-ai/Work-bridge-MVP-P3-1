import type { DealView } from "@/components/deal/types";

/** 거래 진행 바 — 지금 어디까지 왔는지 한 줄로 */
export default function DealStepper({ deal }: { deal: DealView }) {
  const steps = [
    { label: "범위·금액 합의", done: deal.offer.status === "agreed" },
    { label: "계약 서명", done: Boolean(deal.contract?.signedAt) },
    { label: "에스크로 결제", done: ["in_progress", "completed"].includes(deal.dealStatus ?? "") },
    { label: "작업·단계 승인", done: deal.dealStatus === "completed" },
    { label: "완료·평가", done: deal.reviews.length >= 2 },
  ];
  const current = steps.findIndex((s) => !s.done);

  return (
    <ol className="mt-5 grid grid-cols-5 gap-1.5">
      {steps.map((s, i) => {
        const state = s.done ? "done" : i === current ? "now" : "todo";
        return (
          <li key={s.label}>
            <div className={`h-1.5 rounded-full ${state === "done" ? "bg-ok-600" : state === "now" ? "bg-accent-500" : "bg-line-200"}`} />
            <span className={`mt-1.5 block text-[11px] font-semibold leading-tight sm:text-xs ${state === "todo" ? "text-ink-400" : state === "now" ? "text-accent-600" : "text-ok-700"}`}>
              {i + 1}. {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
