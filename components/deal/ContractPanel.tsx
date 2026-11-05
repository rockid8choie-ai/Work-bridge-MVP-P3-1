"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiSend, ApiRequestError } from "@/lib/client/api";
import { dateKo, won } from "@/lib/shared/labels";
import { ErrorText } from "@/components/Field";
import SignaturePad from "@/components/deal/SignaturePad";
import type { DealView } from "@/components/deal/types";

/**
 * 계약서 + 전자 서명 (A-05, A-06). 전문은 /contracts/[id] 에서 상시 조회.
 * 서명 = ① 전문 읽음 체크 ② 서명자 이름 ③ 서명 패드 손글씨. 세 가지가 다 있어야 버튼이 열린다.
 */
export default function ContractPanel({ deal }: { deal: DealView }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [agree, setAgree] = useState(false);
  const [name, setName] = useState(deal.me.isClient ? deal.client.name : deal.freelancer?.name ?? "");
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const c = deal.contract;
  if (!c) return null;

  const mine = deal.me.isClient ? c.clientSignedAt : c.freelancerSignedAt;
  const theirs = deal.me.isClient ? c.freelancerSignedAt : c.clientSignedAt;
  const canSign = agree && name.trim().length >= 2 && Boolean(signature);

  const sign = async () => {
    if (!signature) return;
    setBusy(true);
    setError(null);
    try {
      await apiSend("POST", `/api/projects/${deal.projectId}/contract/sign`, { name: name.trim(), signature });
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
          <h2 className="text-h3 text-ink-900">계약서 · 전자 서명</h2>
          <p className="mt-1 text-[13px] text-ink-500">합의 금액 {won(c.agreedAmount)} · 공사 기간 {c.durationDays}일 · 공정 {c.scopeSnapshot.length}개</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${c.signedAt ? "bg-ok-50 text-ok-700" : "bg-warn-50 text-warn-700"}`}>
          {c.signedAt ? `체결 ${dateKo(c.signedAt)}` : "서명 대기"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <SigBox who={`건물주 ${deal.client.name}`} at={c.clientSignedAt} name={c.clientSignName} image={c.clientSignature} />
        <SigBox who={`전문가 ${deal.freelancer?.name ?? ""}`} at={c.freelancerSignedAt} name={c.freelancerSignName} image={c.freelancerSignature} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link href={`/contracts/${c.id}`} className="btn-secondary px-4 py-2 text-sm">
          계약서 전문 보기
        </Link>
        {c.documentHash && <span className="text-[11px] text-ink-400">문서 지문 {c.documentHash.slice(0, 12)}…</span>}
      </div>

      {!mine && !c.signedAt && (
        <div className="mt-5 rounded-control border border-line-200 p-4">
          <p className="text-sm font-bold text-ink-900">내 전자 서명</p>
          <label className="mt-3 flex items-start gap-2 text-[13px] text-ink-700">
            <input type="checkbox" className="mt-0.5" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            계약서 전문(제1조~제7조)을 읽었고, 제2조 공사 범위와 제3조 금액·기간에 동의합니다.
          </label>
          <label className="mt-3 block text-[13px] text-ink-700">
            서명자 이름
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className="input mt-1 w-full" placeholder="실명을 적어 주세요" />
          </label>
          <div className="mt-3">
            <SignaturePad onChange={setSignature} disabled={busy} />
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[12px] text-ink-400">서명 시각·이름·서명 이미지·문서 지문이 함께 저장됩니다.</p>
            <button type="button" disabled={busy || !canSign} onClick={sign} className="btn-primary shrink-0 px-5 py-2 text-sm">
              {busy ? "서명 중…" : "전자 서명하기"}
            </button>
          </div>
        </div>
      )}
      {mine && !c.signedAt && <p className="mt-3 text-[12.5px] text-ink-400">내 서명은 끝났어요. {theirs ? "" : "상대방 서명을 기다리는 중이에요."}</p>}
      <ErrorText>{error}</ErrorText>
    </section>
  );
}

function SigBox({ who, at, name, image }: { who: string; at: string | null; name: string | null; image: string | null }) {
  return (
    <div className={`rounded-control border p-3 ${at ? "border-ok-600/40 bg-ok-50" : "border-dashed border-line-200 bg-canvas-50"}`}>
      <p className="text-[12px] text-ink-400">{who}</p>
      {at ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL 이라 next/image 를 쓰지 않는다 */}
          {image && <img src={image} alt={`${name ?? ""} 서명`} className="mt-1 h-12 w-auto max-w-full" />}
          <p className="text-[12.5px] font-semibold text-ok-700">
            {name && <span className="mr-1 text-ink-900">{name}</span>}서명 {dateKo(at)}
          </p>
        </>
      ) : (
        <p className="mt-1 text-[13px] font-semibold text-ink-500">미서명</p>
      )}
    </div>
  );
}
