"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiSend, ApiRequestError } from "@/lib/client/api";
import { dateKo } from "@/lib/shared/labels";
import { ErrorText, inputClass } from "@/components/Field";
import type { DealView } from "@/components/deal/types";

const TAGS = {
  client_to_freelancer: ["책임감", "소통", "기술력", "시간 약속", "뒷정리"],
  freelancer_to_client: ["명확한 요구사항", "신속한 피드백", "정확한 결제", "현장 협조", "합리적 기대"],
} as const;

/** 상호 평가 (A-12) — 완료된 공사, 1회, 수정 불가 */
export default function ReviewPanel({ deal }: { deal: DealView }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (deal.dealStatus !== "completed") return null;

  const myDirection = deal.me.isClient ? "client_to_freelancer" : "freelancer_to_client";
  const mine = deal.reviews.find((r) => r.direction === myDirection);
  const theirs = deal.reviews.find((r) => r.direction !== myDirection);
  const targetName = deal.me.isClient ? deal.freelancer?.name : deal.client.name;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiSend("POST", `/api/projects/${deal.projectId}/reviews`, { rating, tags, comment: comment || undefined });
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "평가를 남기지 못했어요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card p-5 sm:p-6">
      <h2 className="text-h3 text-ink-900">상호 평가</h2>
      <p className="mt-1 text-[13px] text-ink-500">공사가 끝났어요. 서로를 한 번만 평가할 수 있고 수정할 수 없습니다.</p>

      {mine ? (
        <div className="mt-4 rounded-control bg-ok-50 p-4">
          <p className="text-sm font-bold text-ink-900">내가 남긴 평가 · {"★".repeat(mine.rating)}{"☆".repeat(5 - mine.rating)}</p>
          {mine.tags.length > 0 && <p className="mt-1 flex flex-wrap gap-1">{mine.tags.map((t) => <span key={t} className="rounded-full bg-paper px-2 py-0.5 text-[11px] text-ink-700">{t}</span>)}</p>}
          {mine.comment && <p className="mt-1.5 text-[13px] text-ink-700">{mine.comment}</p>}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-sm font-semibold text-ink-900">{targetName} 님은 어땠나요?</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} className={`text-2xl ${n <= rating ? "text-warn-500" : "text-line-200"}`} aria-label={`${n}점`}>
                ★
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TAGS[myDirection].map((t) => {
              const on = tags.includes(t);
              return (
                <button key={t} type="button" onClick={() => setTags((ts) => (on ? ts.filter((x) => x !== t) : [...ts, t]))} className={`rounded-full border px-2.5 py-1 text-[12.5px] ${on ? "border-ink-900 bg-ink-900 text-white" : "border-line-200 text-ink-700"}`}>
                  {t}
                </button>
              );
            })}
          </div>
          <textarea rows={3} className={inputClass} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="다음 사람에게 도움이 될 한마디 (선택)" />
          <ErrorText>{error}</ErrorText>
          <button type="button" disabled={busy || rating === 0} onClick={submit} className="btn-primary px-5 py-2.5 text-sm">
            {busy ? "남기는 중…" : "평가 남기기"}
          </button>
        </div>
      )}

      {theirs && (
        <div className="mt-4 rounded-control bg-canvas-50 p-4">
          <p className="text-sm font-bold text-ink-900">
            {deal.me.isClient ? deal.freelancer?.name : deal.client.name} 님의 평가 · {"★".repeat(theirs.rating)}{"☆".repeat(5 - theirs.rating)}
            <span className="ml-2 text-[12px] font-normal text-ink-400">{dateKo(theirs.createdAt)}</span>
          </p>
          {theirs.tags.length > 0 && <p className="mt-1 flex flex-wrap gap-1">{theirs.tags.map((t) => <span key={t} className="rounded-full bg-paper px-2 py-0.5 text-[11px] text-ink-700">{t}</span>)}</p>}
          {theirs.comment && <p className="mt-1.5 text-[13px] text-ink-700">{theirs.comment}</p>}
        </div>
      )}
    </section>
  );
}
