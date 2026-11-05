"use client";

import { useState } from "react";
import Link from "next/link";
import { apiSend, ApiRequestError } from "@/lib/client/api";
import { dateKo, PAYMENT_LABEL, won } from "@/lib/shared/labels";
import { ErrorText } from "@/components/Field";
import type { DealView } from "@/components/deal/types";

type Order = { clientKey: string; orderId: string; amount: number; orderName: string; customerName: string; customerEmail: string; customerKey: string };

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      payment: (o: { customerKey: string }) => { requestPayment: (p: Record<string, unknown>) => Promise<void> };
    };
  }
}

function loadSdk() {
  return new Promise<void>((resolve, reject) => {
    if (window.TossPayments) return resolve();
    const s = document.createElement("script");
    s.src = "https://js.tosspayments.com/v2/standard";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("결제 모듈을 불러오지 못했어요"));
    document.head.appendChild(s);
  });
}

/** 에스크로 선결제 (A-07, A-09) — 토스페이먼츠 sandbox 결제창. 승인은 /pay/success 에서 서버가 한다. */
export default function PaymentPanel({ deal }: { deal: DealView }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const c = deal.contract;
  if (!c?.signedAt) return null;

  const paid = c.payments.find((p) => p.status !== "pending");

  const pay = async () => {
    setBusy(true);
    setError(null);
    try {
      const { order } = await apiSend<{ order: Order }>("POST", `/api/projects/${deal.projectId}/payments`, {});
      await loadSdk();
      const payment = window.TossPayments!(order.clientKey).payment({ customerKey: order.customerKey });
      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: order.amount },
        orderId: order.orderId,
        orderName: order.orderName,
        successUrl: `${window.location.origin}/pay/success`,
        failUrl: `${window.location.origin}/pay/fail`,
        customerEmail: order.customerEmail,
        customerName: order.customerName,
        card: { useEscrow: false, flowMode: "DEFAULT", useCardPoint: false, useAppCardOnly: false },
      });
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : e instanceof Error ? e.message : "결제창을 열지 못했어요.");
      setBusy(false);
    }
  };

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-h3 text-ink-900">에스크로 결제</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-500">
            건물주가 합의 금액 전액을 플랫폼에 먼저 맡깁니다. 돈은 공정 하나가 끝나고 승인될 때마다 그 금액만 전문가에게 지급돼요.
          </p>
        </div>
        {paid && <span className="shrink-0 rounded-full bg-ok-50 px-2.5 py-1 text-[11px] font-semibold text-ok-700">{PAYMENT_LABEL[paid.status]}</span>}
      </div>

      {paid ? (
        <dl className="mt-4 grid grid-cols-2 gap-3 rounded-control bg-canvas-50 p-3 text-[13px] sm:grid-cols-4">
          <div><dt className="text-ink-400">결제 금액</dt><dd className="font-bold text-ink-900">{won(paid.amount)}</dd></div>
          <div><dt className="text-ink-400">수단</dt><dd className="font-semibold text-ink-900">{paid.method ?? "-"}</dd></div>
          <div><dt className="text-ink-400">결제일</dt><dd className="font-semibold text-ink-900">{paid.paidAt ? dateKo(paid.paidAt) : "-"}</dd></div>
          <div><dt className="text-ink-400">영수증</dt><dd>{paid.receiptUrl ? <a href={paid.receiptUrl} target="_blank" rel="noreferrer" className="font-semibold text-accent-600">보기 ↗</a> : <span className="text-ink-400">-</span>}</dd></div>
        </dl>
      ) : deal.me.isClient ? (
        <div className="mt-4">
          <div className="flex items-center justify-between rounded-control bg-canvas-50 p-3">
            <span className="text-sm text-ink-700">결제할 금액</span>
            <span className="text-[17px] font-bold tabular-nums text-ink-900">{won(c.agreedAmount)}</span>
          </div>
          <button type="button" disabled={busy} onClick={pay} className="btn-accent mt-3 px-6 py-3 text-sm">
            {busy ? "결제창 여는 중…" : "테스트 결제로 선결제하기"}
          </button>
          <p className="mt-2 text-[12px] text-ink-400">샌드박스 결제라 실제 돈은 빠져나가지 않아요. 결제창에서 아무 카드사나 고르면 됩니다.</p>
          <ErrorText>{error}</ErrorText>
        </div>
      ) : (
        <p className="mt-4 rounded-control bg-canvas-50 px-3 py-2.5 text-[13px] text-ink-500">건물주가 선결제하면 작업을 시작할 수 있어요. 결제가 끝나면 알림이 옵니다.</p>
      )}

      <Link href="/me/payments" className="mt-3 inline-block text-[13px] font-semibold text-accent-600">
        결제 내역 전체 보기 →
      </Link>
    </section>
  );
}
