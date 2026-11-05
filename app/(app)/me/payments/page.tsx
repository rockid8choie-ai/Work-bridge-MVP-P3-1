import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server/auth";
import { listPayments } from "@/lib/server/payments";
import { dateKo, PAYMENT_LABEL, won } from "@/lib/shared/labels";

/** 결제 내역 (A-08). 건물주는 낸 돈, 전문가는 받을 돈 기준. */
export default async function PaymentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const payments = await listPayments(user.id, user.role);
  const isClient = user.role === "client";

  return (
    <div className="max-w-2xl">
      <h1 className="text-h2 text-ink-900">결제 내역</h1>
      <p className="mt-1 text-sm text-ink-500">{isClient ? "에스크로에 맡긴 돈과 지급된 돈" : "에스크로에 들어온 돈과 받은 돈"} · 전체 {payments.length}건</p>

      <ul className="mt-6 space-y-3">
        {payments.length === 0 && <li className="card px-4 py-14 text-center text-sm text-ink-400">아직 결제 내역이 없어요</li>}
        {payments.map((p) => {
          const approved = p.contract.milestones.filter((m) => m.status === "approved");
          const net = approved.reduce((s, m) => s + (m.net ?? 0), 0);
          const fee = approved.reduce((s, m) => s + (m.fee ?? 0), 0);
          return (
            <li key={p.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/projects/${p.contract.project.id}/deal`} className="font-bold leading-snug text-ink-900">
                    {p.contract.project.title}
                  </Link>
                  <p className="mt-1 text-[13px] text-ink-500">
                    {isClient ? `전문가 ${p.contract.application.freelancer.name}` : `건물주 ${p.contract.project.client.name}`} · 주문 {p.pgOrderId}
                    {p.paidAt && ` · ${dateKo(p.paidAt)} 결제`}
                    {p.method && ` · ${p.method}`}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${p.status === "pending" ? "bg-warn-50 text-warn-700" : p.status === "settled" ? "bg-ok-50 text-ok-700" : "bg-accent-50 text-accent-600"}`}>
                  {PAYMENT_LABEL[p.status]}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 rounded-control bg-canvas-50 p-3 text-[13px]">
                <div><dt className="text-ink-400">결제 금액</dt><dd className="font-bold tabular-nums text-ink-900">{won(p.amount)}</dd></div>
                <div><dt className="text-ink-400">{isClient ? "지급 완료" : "받은 금액"}</dt><dd className="font-bold tabular-nums text-ok-700">{won(net)}</dd></div>
                <div><dt className="text-ink-400">수수료</dt><dd className="font-bold tabular-nums text-ink-900">{won(fee)}</dd></div>
              </dl>
              <p className="mt-2 text-[12px] text-ink-400">
                단계 {approved.length}/{p.contract.milestones.length} 승인
                {p.receiptUrl && (
                  <>
                    {" "}· <a href={p.receiptUrl} target="_blank" rel="noreferrer" className="font-semibold text-accent-600">영수증 ↗</a>
                  </>
                )}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
