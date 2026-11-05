"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiSend, ApiRequestError } from "@/lib/client/api";
import { dateKo, won } from "@/lib/shared/labels";
import { ErrorText, inputClass, Label } from "@/components/Field";
import type { DealView } from "@/components/deal/types";

/** 금액 합의 (A-03, A-04 · D-05 한 번 제시 → 동의/거부) */
export default function OfferPanel({ deal }: { deal: DealView }) {
  const router = useRouter();
  const suggested = deal.analysis?.totalEstimate ?? deal.application?.proposedAmount ?? deal.budget ?? 0;
  const [amount, setAmount] = useState(String(suggested));
  const [days, setDays] = useState(String(deal.application?.proposedDays ?? 7));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDecline, setConfirmDecline] = useState(false);

  const offer = deal.offer;
  const done = offer.status === "agreed";

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiSend("POST", `/api/projects/${deal.projectId}/offer`, { amount: Number(amount), days: Number(days), message: message || undefined });
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "제시하지 못했어요.");
    } finally {
      setBusy(false);
    }
  };

  const decide = async (decision: "agree" | "decline") => {
    setBusy(true);
    setError(null);
    try {
      await apiSend("PATCH", `/api/projects/${deal.projectId}/offer`, { decision });
      if (decision === "decline") router.push("/me/applications");
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "처리하지 못했어요.");
      setBusy(false);
    }
  };

  return (
    <section className="card p-5 sm:p-6">
      <h2 className="text-h3 text-ink-900">금액 합의</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-500">
        범위표를 기준으로 건물주가 금액과 기간을 한 번 제시하고, 전문가가 동의하거나 거부합니다. 동의하면 계약서가 자동으로
        만들어집니다.
      </p>

      {offer.status && (
        <div className={`mt-4 rounded-control p-4 ${done ? "bg-ok-50" : offer.status === "declined" ? "bg-canvas-50" : "bg-warn-50"}`}>
          <p className="text-sm text-ink-900">
            <b>{won(offer.amount)}</b> · {offer.days}일
            <span className="ml-2 text-[12px] text-ink-500">
              {offer.offeredAt && dateKo(offer.offeredAt)} 제시 · {done ? "합의 완료" : offer.status === "declined" ? "거부됨" : "전문가 응답 대기"}
            </span>
          </p>
          {offer.message && <p className="mt-1.5 whitespace-pre-wrap text-[13px] text-ink-700">{offer.message}</p>}
        </div>
      )}

      {deal.me.isClient && !done && offer.status !== "pending" && deal.dealStatus === "awaiting_contract" && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <Label hint={deal.analysis ? "범위표 합계 기준" : "지원서 금액 기준"}>합의 금액(원)</Label>
              <input type="number" min={10000} step={10000} className={inputClass} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>
            <label className="block">
              <Label>공사 기간(일)</Label>
              <input type="number" min={1} max={365} className={inputClass} value={days} onChange={(e) => setDays(e.target.value)} />
            </label>
          </div>
          <label className="block">
            <Label hint="선택">전문가에게 한마디</Label>
            <input className={inputClass} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="주말 작업 가능하면 이 금액으로 부탁드립니다" />
          </label>
          <ErrorText>{error}</ErrorText>
          <button type="button" disabled={busy || Number(amount) < 10000 || Number(days) < 1} onClick={send} className="btn-primary px-5 py-2.5 text-sm">
            {busy ? "보내는 중…" : "이 금액으로 제시"}
          </button>
          <p className="text-[12px] text-ink-400">한 번만 제시할 수 있어요. 전문가가 거부하면 지원은 거절되고 공사는 다시 모집 중으로 돌아갑니다.</p>
        </div>
      )}

      {deal.me.isFreelancer && offer.status === "pending" && (
        <div className="mt-4 space-y-3">
          <ErrorText>{error}</ErrorText>
          {confirmDecline ? (
            <div className="rounded-control bg-canvas-50 p-4">
              <p className="text-sm text-ink-700">거부하면 이 공사 지원은 거절 처리되고 건물주는 다시 모집을 시작합니다. 되돌릴 수 없어요.</p>
              <div className="mt-3 flex gap-2">
                <button type="button" disabled={busy} onClick={() => decide("decline")} className="rounded-control bg-danger-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                  {busy ? "처리 중…" : "네, 거부합니다"}
                </button>
                <button type="button" onClick={() => setConfirmDecline(false)} className="btn-secondary px-4 py-2 text-sm">
                  아니요
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button type="button" disabled={busy} onClick={() => decide("agree")} className="rounded-control bg-ok-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                {busy ? "처리 중…" : "동의하고 계약서 만들기"}
              </button>
              <button type="button" disabled={busy} onClick={() => setConfirmDecline(true)} className="btn-secondary px-4 py-2.5 text-sm">
                거부
              </button>
            </div>
          )}
          <p className="text-[12px] text-ink-400">범위표를 먼저 고치고 싶다면 위 &ldquo;공정표 고치기&rdquo;는 응답 뒤에 다시 열립니다. 금액이 맞지 않으면 거부해 주세요.</p>
        </div>
      )}

      {deal.me.isFreelancer && !offer.status && (
        <p className="mt-4 rounded-control bg-canvas-50 px-3 py-2.5 text-[13px] text-ink-500">
          건물주가 금액을 제시하면 여기서 동의·거부할 수 있어요. 그 전에 범위표를 현장 기준으로 고쳐 두면 좋습니다.
        </p>
      )}
      {deal.me.isClient && offer.status === "pending" && <p className="mt-3 text-[12.5px] text-ink-400">전문가가 응답하면 알림이 와요.</p>}
    </section>
  );
}
