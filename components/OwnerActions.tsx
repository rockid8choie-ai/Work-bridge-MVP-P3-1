"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiSend, ApiRequestError } from "@/lib/client/api";

type Props = {
  projectId: string;
  recruitStatus: "scheduled" | "open" | "closed";
  dealStatus: "awaiting_contract" | "awaiting_payment" | "in_progress" | "completed" | "cancelled" | null;
  pendingCount: number;
};

/**
 * 건물주용 액션 묶음 — 지원자 관리 · 수정 · 모집 마감 · 취소 · 삭제 (B-08, B-09, B-21, B-32).
 * 되돌리기 어려운 동작은 한 번 더 누르게 한다 (브라우저 confirm 대신 인라인 확인).
 */
export default function OwnerActions({ projectId, recruitStatus, dealStatus, pendingCount }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<null | "close" | "cancel" | "delete">(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const inDeal = dealStatus !== null && dealStatus !== "cancelled";
  const canClose = recruitStatus !== "closed";
  const canCancel = dealStatus === null || dealStatus === "awaiting_contract";
  const canDelete = !inDeal;
  const canEdit = !inDeal;

  const run = async (kind: "close" | "cancel" | "delete") => {
    setBusy(true);
    setError(null);
    try {
      if (kind === "delete") {
        await apiSend("DELETE", `/api/projects/${projectId}`);
        router.push("/me/projects");
      } else {
        await apiSend("POST", `/api/projects/${projectId}/${kind}`, {});
      }
      setConfirming(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "처리하지 못했어요.");
    } finally {
      setBusy(false);
    }
  };

  const LABEL = {
    close: `모집을 마감할까요? 검토중인 지원 ${pendingCount}건은 모두 거절되고 지원자에게 알림이 갑니다.`,
    cancel: "프로젝트를 취소할까요? 지원자 전원에게 취소 알림이 갑니다. 계약 체결 뒤에는 취소할 수 없습니다.",
    delete: "프로젝트를 삭제할까요? 목록에서 사라지며 되돌릴 수 없습니다.",
  } as const;

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 p-5">
      <h2 className="text-sm font-bold text-slate-700">내 프로젝트 관리</h2>

      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={`/projects/${projectId}/applicants`}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white"
        >
          지원자 관리{pendingCount > 0 && ` (${pendingCount})`}
        </Link>
        {canEdit && (
          <Link
            href={`/projects/${projectId}/edit`}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700"
          >
            수정
          </Link>
        )}
        {canClose && (
          <button
            type="button"
            onClick={() => setConfirming("close")}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700"
          >
            모집 마감
          </button>
        )}
        {canCancel && (
          <button
            type="button"
            onClick={() => setConfirming("cancel")}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-500"
          >
            취소
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            onClick={() => setConfirming("delete")}
            className="rounded-xl px-3 py-2 text-sm font-semibold text-red-500"
          >
            삭제
          </button>
        )}
      </div>

      {confirming && (
        <div className="mt-4 rounded-xl bg-slate-50 p-4">
          <p className="text-sm text-slate-700">{LABEL[confirming]}</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => run(confirming)}
              className={`rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50 ${
                confirming === "delete" ? "bg-red-600" : "bg-slate-900"
              }`}
            >
              {busy ? "처리 중…" : "네, 진행합니다"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirming(null)}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-500"
            >
              아니요
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
    </section>
  );
}
