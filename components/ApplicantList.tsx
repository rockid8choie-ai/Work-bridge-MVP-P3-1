"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiSend, ApiRequestError } from "@/lib/client/api";
import { APPLICATION_LABEL, APPLICATION_STYLE, won } from "@/lib/shared/labels";

type Applicant = {
  id: string;
  status: "pending" | "accepted" | "rejected";
  coverLetter: string;
  proposedAmount: number;
  proposedDays: number;
  createdAt: string;
  freelancer: {
    id: string;
    name: string;
    bio: string | null;
    mainCategory: string | null;
    years: number | null;
    hourlyRate: number | null;
    portfolioUrl: string | null;
    skills: string[];
  };
};

type Payload = {
  project: { id: string; title: string; recruitStatus: string; dealStatus: string | null };
  applications: Applicant[];
};

/** 지원자 관리 (B-19, B-20) — 수락하면 나머지는 자동 거절된다는 것을 버튼 옆에서 미리 알린다 */
export default function ApplicantList({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmAccept, setConfirmAccept] = useState<string | null>(null);

  const load = useCallback(() => {
    apiGet<Payload>(`/api/projects/${projectId}/applications`)
      .then(setData)
      .catch((e) => setError(e instanceof ApiRequestError ? e.message : "불러오지 못했어요."));
  }, [projectId]);

  useEffect(load, [load]);

  const decide = async (id: string, action: "accept" | "reject") => {
    setBusyId(id);
    setError(null);
    try {
      await apiSend("PATCH", `/api/applications/${id}`, { action });
      setConfirmAccept(null);
      load();
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "처리하지 못했어요.");
    } finally {
      setBusyId(null);
    }
  };

  if (error && !data) return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>;
  if (!data) return <p className="py-10 text-center text-sm text-slate-400">불러오는 중…</p>;

  const pending = data.applications.filter((a) => a.status === "pending").length;
  const decided = data.project.dealStatus !== null;

  return (
    <div>
      <p className="text-sm text-slate-500">
        전체 {data.applications.length}건 · 검토중 {pending}건
      </p>

      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <ul className="mt-4 space-y-3">
        {data.applications.length === 0 && (
          <li className="rounded-2xl bg-slate-50 px-4 py-12 text-center text-sm text-slate-400">
            아직 지원자가 없어요
          </li>
        )}

        {data.applications.map((a) => (
          <li key={a.id} className="rounded-2xl border border-slate-100 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-slate-900">
                  {a.freelancer.name}
                  {a.freelancer.mainCategory && (
                    <span className="ml-1.5 text-[13px] font-normal text-slate-500">
                      {a.freelancer.mainCategory} · 경력 {a.freelancer.years}년
                    </span>
                  )}
                </p>
                <p className="mt-1 flex flex-wrap gap-1">
                  {a.freelancer.skills.map((s) => (
                    <span key={s} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                      {s}
                    </span>
                  ))}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${APPLICATION_STYLE[a.status]}`}>
                {APPLICATION_LABEL[a.status]}
              </span>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-sm">
              <div>
                <dt className="text-xs text-slate-400">예상 금액</dt>
                <dd className="font-bold text-slate-900">{won(a.proposedAmount)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">예상 기간</dt>
                <dd className="font-bold text-slate-900">{a.proposedDays}일</dd>
              </div>
            </dl>

            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{a.coverLetter}</p>

            {a.freelancer.portfolioUrl && (
              <a
                href={a.freelancer.portfolioUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-[13px] font-semibold text-blue-600"
              >
                포트폴리오 보기 ↗
              </a>
            )}

            {a.status === "pending" && !decided && (
              <div className="mt-4">
                {confirmAccept === a.id ? (
                  <div className="rounded-xl bg-emerald-50 p-3">
                    <p className="text-sm text-emerald-900">
                      {a.freelancer.name} 전문가를 수락할까요? 검토중인 나머지 {pending - 1}명은 자동 거절되고,
                      모집이 마감되며 계약 대기 단계로 넘어갑니다.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        disabled={busyId === a.id}
                        onClick={() => decide(a.id, "accept")}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                      >
                        {busyId === a.id ? "처리 중…" : "수락 확정"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmAccept(null)}
                        className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmAccept(a.id)}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white"
                    >
                      수락
                    </button>
                    <button
                      type="button"
                      disabled={busyId === a.id}
                      onClick={() => decide(a.id, "reject")}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 disabled:opacity-50"
                    >
                      거절
                    </button>
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
