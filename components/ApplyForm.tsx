"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost, ApiRequestError } from "@/lib/client/api";
import { ErrorText, inputClass, Label } from "@/components/Field";

/**
 * 지원서 제출 (B-18, B-23).
 * 프로필이 비어 있으면 서버가 428 을 주고, 프로필 화면을 거쳐 이 프로젝트로 되돌아온다 (B-06).
 * 제출 직후에는 '내 지원 현황'으로 보낸다 (B-23).
 */
export default function ApplyForm({ projectId, budget }: { projectId: string; budget: number | null }) {
  const router = useRouter();
  const [coverLetter, setCoverLetter] = useState("");
  const [amount, setAmount] = useState(budget ? String(budget) : "");
  const [days, setDays] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const back = `/projects/${projectId}`;
  const canSubmit = coverLetter.trim().length >= 20 && Number(amount) >= 10_000 && Number(days) >= 1;

  const submit = async () => {
    if (busy || !canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await apiPost(`/api/projects/${projectId}/applications`, {
        coverLetter,
        proposedAmount: Number(amount),
        proposedDays: Number(days),
      });
      router.push("/me/applications");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === "PROFILE_REQUIRED") {
        router.replace(`/profile?next=${encodeURIComponent(back)}`);
        return;
      }
      setError(err instanceof ApiRequestError ? err.message : "지원하지 못했어요.");
      setBusy(false);
    }
  };

  return (
    <section className="mt-8 card p-5">
      <h2 className="text-h3 text-ink-900">이 공사에 지원하기</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-500">
        금액은 참고용입니다. 수락되면 공정표를 함께 확정한 뒤 금액을 합의합니다.
      </p>

      <div className="mt-4 space-y-4">
        <label className="block">
          <Label hint="20자 이상">어떻게 진행할 건가요?</Label>
          <textarea
            rows={5}
            className={inputClass}
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            placeholder="비슷한 공사 경험, 진단 방식, 작업 순서, 주말 작업 가능 여부 등을 적어 주세요."
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <Label>예상 금액(원)</Label>
            <input
              type="number"
              min={10000}
              step={10000}
              className={inputClass}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="3200000"
            />
          </label>
          <label className="block">
            <Label>예상 기간(일)</Label>
            <input
              type="number"
              min={1}
              max={365}
              className={inputClass}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              placeholder="7"
            />
          </label>
        </div>

        <ErrorText>{error}</ErrorText>

        <button
          type="button"
          disabled={!canSubmit || busy}
          onClick={submit}
          className="btn-primary w-full py-3 text-sm"
        >
          {busy ? "제출 중…" : "지원서 제출"}
        </button>
      </div>
    </section>
  );
}
