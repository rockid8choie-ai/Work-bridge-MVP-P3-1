"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiSend, ApiRequestError } from "@/lib/client/api";
import { dateKo, MILESTONE_LABEL, MILESTONE_STYLE, won } from "@/lib/shared/labels";
import { ErrorText, inputClass } from "@/components/Field";
import type { DealView } from "@/components/deal/types";

/** 작업 단계 — 납품 요청(전문가) → 완료 승인(건물주) → 수수료 10% 차감 지급 (A-10, A-11, C-01) */
export default function MilestonePanel({ deal }: { deal: DealView }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const c = deal.contract;
  if (!c?.signedAt) return null;

  const active = deal.dealStatus === "in_progress" || deal.dealStatus === "completed";
  const approvedNet = c.milestones.filter((m) => m.status === "approved").reduce((s, m) => s + (m.net ?? 0), 0);
  const approvedFee = c.milestones.filter((m) => m.status === "approved").reduce((s, m) => s + (m.fee ?? 0), 0);
  const held = c.agreedAmount - approvedNet - approvedFee;

  const act = async (id: string, kind: "submit" | "approve") => {
    setBusyId(id);
    setError(null);
    try {
      await apiSend("POST", `/api/milestones/${id}/${kind}`, kind === "submit" ? { note: note[id] || undefined } : {});
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "처리하지 못했어요.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="card p-5 sm:p-6">
      <h2 className="text-h3 text-ink-900">작업 단계와 정산</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-500">
        범위표의 공정 하나가 작업 단계 하나예요. 전문가가 끝낸 단계를 승인 요청하면 건물주가 확인하고 승인합니다. 승인된 금액은 수수료
        10%를 뺀 뒤 지급 처리돼요.
      </p>
      {!active && <p className="mt-3 rounded-control bg-warn-50 px-3 py-2 text-[13px] text-warn-700">에스크로 결제가 끝나면 단계가 열립니다.</p>}

      <ol className="mt-4 divide-y divide-line-100 rounded-control border border-line-200">
        {c.milestones.map((m) => (
          <li key={m.id} className="p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-ink-900">
                  <span className="mr-2 text-[12px] font-semibold text-ink-400">{m.sortOrder + 1}</span>
                  {m.title}
                </p>
                <p className="mt-0.5 text-[12.5px] text-ink-500">
                  {m.status === "approved" && m.approvedAt && `${dateKo(m.approvedAt)} 승인 · 수수료 ${won(m.fee)} · 지급 ${won(m.net)}`}
                  {m.status === "submitted" && m.submittedAt && `${dateKo(m.submittedAt)} 승인 요청${m.note ? ` · ${m.note}` : ""}`}
                  {(m.status === "todo" || m.status === "in_progress") && "승인 전"}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="font-bold tabular-nums text-ink-900">{won(m.amount)}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${MILESTONE_STYLE[m.status]}`}>{MILESTONE_LABEL[m.status]}</span>
              </div>
            </div>

            {active && deal.me.isFreelancer && (m.status === "todo" || m.status === "in_progress") && deal.dealStatus === "in_progress" && (
              <div className="mt-3 flex gap-2">
                <input className={inputClass} value={note[m.id] ?? ""} onChange={(e) => setNote((n) => ({ ...n, [m.id]: e.target.value }))} placeholder="작업 결과 한 줄 (선택)" />
                <button type="button" disabled={busyId === m.id} onClick={() => act(m.id, "submit")} className="btn-primary shrink-0 px-4 py-2 text-sm">
                  {busyId === m.id ? "요청 중…" : "완료 승인 요청"}
                </button>
              </div>
            )}
            {active && deal.me.isClient && m.status === "submitted" && (
              <div className="mt-3 flex items-center gap-3">
                <button type="button" disabled={busyId === m.id} onClick={() => act(m.id, "approve")} className="rounded-control bg-ok-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                  {busyId === m.id ? "승인 중…" : `승인하고 ${won(m.amount)} 지급`}
                </button>
                <span className="text-[12px] text-ink-400">수수료 10% 차감 후 {won(Math.round(m.amount * 0.9))} 지급</span>
              </div>
            )}
          </li>
        ))}
      </ol>

      <dl className="mt-3 grid grid-cols-3 gap-3 rounded-control bg-canvas-50 p-3 text-[13px]">
        <div><dt className="text-ink-400">에스크로 보관</dt><dd className="font-bold tabular-nums text-ink-900">{won(Math.max(0, held))}</dd></div>
        <div><dt className="text-ink-400">전문가 지급</dt><dd className="font-bold tabular-nums text-ok-700">{won(approvedNet)}</dd></div>
        <div><dt className="text-ink-400">플랫폼 수수료</dt><dd className="font-bold tabular-nums text-ink-900">{won(approvedFee)}</dd></div>
      </dl>
      <p className="mt-2 text-[11.5px] text-ink-400">실제 이체는 MVP 범위 밖이에요. 지급 처리 기록만 남깁니다.</p>
      <ErrorText>{error}</ErrorText>
    </section>
  );
}
