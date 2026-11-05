"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiSend, ApiRequestError } from "@/lib/client/api";
import { dateKo, won } from "@/lib/shared/labels";
import { ErrorText } from "@/components/Field";
import type { DealView } from "@/components/deal/types";

/** 계약서 + 전자 서명 (A-05, A-06). 전문은 /contracts/[id] 에서 상시 조회. */
export default function ContractPanel({ deal }: { deal: DealView }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const c = deal.contract;
  if (!c) return null;

  const mine = deal.me.isClient ? c.clientSignedAt : c.freelancerSignedAt;
  const theirs = deal.me.isClient ? c.freelancerSignedAt : c.clientSignedAt;

  const sign = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiSend("POST", `/api/projects/${deal.projectId}/contract/sign`, {});
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "서명하지 못했어요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-h3 text-ink-900">계약서</h2>
          <p className="mt-1 text-[13px] text-ink-500">합의 금액 {won(c.agreedAmount)} · 공사 기간 {c.durationDays}일 · 공정 {c.scopeSnapshot.length}개</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${c.signedAt ? "bg-ok-50 text-ok-700" : "bg-warn-50 text-warn-700"}`}>
          {c.signedAt ? `체결 ${dateKo(c.signedAt)}` : "서명 대기"}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 rounded-control bg-canvas-50 p-3 text-[13px]">
        <div>
          <dt className="text-ink-400">건물주 {deal.client.name}</dt>
          <dd className={`font-semibold ${c.clientSignedAt ? "text-ok-700" : "text-ink-500"}`}>{c.clientSignedAt ? `서명 ${dateKo(c.clientSignedAt)}` : "미서명"}</dd>
        </div>
        <div>
          <dt className="text-ink-400">전문가 {deal.freelancer?.name}</dt>
          <dd className={`font-semibold ${c.freelancerSignedAt ? "text-ok-700" : "text-ink-500"}`}>{c.freelancerSignedAt ? `서명 ${dateKo(c.freelancerSignedAt)}` : "미서명"}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link href={`/contracts/${c.id}`} className="btn-secondary px-4 py-2 text-sm">
          계약서 전문 보기
        </Link>
        {!mine && !c.signedAt && (
          <label className="flex items-center gap-2 text-[13px] text-ink-700">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            계약서 전문을 읽었고 공사 범위 조항에 동의합니다
          </label>
        )}
        {!mine && !c.signedAt && (
          <button type="button" disabled={busy || !agree} onClick={sign} className="btn-primary px-5 py-2 text-sm">
            {busy ? "서명 중…" : "전자 서명"}
          </button>
        )}
      </div>
      {mine && !c.signedAt && <p className="mt-3 text-[12.5px] text-ink-400">내 서명은 끝났어요. {theirs ? "" : "상대방 서명을 기다리는 중이에요."}</p>}
      <ErrorText>{error}</ErrorText>
    </section>
  );
}
