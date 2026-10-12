"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, ApiRequestError } from "@/lib/client/api";
import { ErrorText, inputClass, Label } from "@/components/Field";

const CATEGORIES = [
  "누수·방수",
  "전기·조명",
  "설비·배관",
  "외벽·도장",
  "인테리어·목공",
  "소방·안전",
  "공조·환기",
  "기타",
];

const STEPS = ["기본 정보", "일정과 예산", "필요 전문분야"];

type Skill = { id: string; name: string };

export default function NewProjectPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [recruitStartAt, setRecruitStartAt] = useState("");
  const [deadlineAt, setDeadlineAt] = useState("");
  const [budget, setBudget] = useState("");
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    apiGet<{ skills: Skill[] }>("/api/skills")
      .then((d) => setSkills(d.skills))
      .catch(() => {});
  }, []);

  // 프로필이 비어 있으면 여기서 막히고 프로필 화면으로 보낸 뒤 되돌아온다 (AC B-06)
  useEffect(() => {
    apiGet<{ user: unknown; profileComplete: boolean }>("/api/auth/me")
      .then((d) => {
        if (d.user && !d.profileComplete) {
          router.replace(`/profile?next=${encodeURIComponent("/projects/new")}`);
        }
      })
      .catch(() => {});
  }, [router]);

  const canNext =
    step === 0
      ? title.trim().length >= 5 && description.trim().length >= 20 && category !== ""
      : step === 1
        ? deadlineAt !== ""
        : picked.length > 0;

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const { project } = await apiPost<{ project: { id: string } }>("/api/projects", {
        title,
        description,
        category,
        recruitStartAt: recruitStartAt ? new Date(recruitStartAt).toISOString() : null,
        deadlineAt: new Date(deadlineAt).toISOString(),
        budget: budget === "" ? null : Number(budget),
        skills: picked,
      });
      router.push(`/projects/${project.id}`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === "PROFILE_REQUIRED") {
        router.replace(`/profile?next=${encodeURIComponent("/projects/new")}`);
        return;
      }
      setError(err instanceof ApiRequestError ? err.message : "등록하지 못했어요.");
      setBusy(false);
    }
  };

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-extrabold tracking-tight text-slate-900">공사 등록</h1>

      <ol className="mt-5 flex gap-2">
        {STEPS.map((label, i) => (
          <li key={label} className="flex-1">
            <div className={`h-1 rounded-full ${i <= step ? "bg-blue-600" : "bg-slate-200"}`} />
            <span
              className={`mt-1.5 block text-xs font-semibold ${
                i <= step ? "text-blue-600" : "text-slate-400"
              }`}
            >
              {i + 1}. {label}
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-7 space-y-5">
        {step === 0 && (
          <>
            <label className="block">
              <Label hint="5자 이상">제목</Label>
              <input
                className={inputClass}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="3층 화장실 천장 누수 보수"
              />
            </label>
            <label className="block">
              <Label hint="20자 이상">어떤 공사인가요?</Label>
              <textarea
                rows={6}
                className={inputClass}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="언제부터 어떤 증상이 있는지, 어디까지 번졌는지, 임차인 영업 여부 등을 적어 주시면 AI가 공정을 더 정확히 쪼갭니다."
              />
            </label>
            <label className="block">
              <Label>카테고리</Label>
              <select
                className={inputClass}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">선택해 주세요</option>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </>
        )}

        {step === 1 && (
          <>
            <label className="block">
              <Label hint="비우면 바로 모집 시작">모집 시작일</Label>
              <input
                type="date"
                className={inputClass}
                value={recruitStartAt}
                onChange={(e) => setRecruitStartAt(e.target.value)}
              />
            </label>
            <label className="block">
              <Label>모집 마감일</Label>
              <input
                type="date"
                className={inputClass}
                value={deadlineAt}
                onChange={(e) => setDeadlineAt(e.target.value)}
              />
            </label>
            <label className="block">
              <Label hint="모르면 비워 두세요 — AI 분석으로 채울 수 있어요">예산(원)</Label>
              <input
                type="number"
                min={0}
                step={100000}
                className={inputClass}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="3200000"
              />
            </label>
          </>
        )}

        {step === 2 && (
          <div>
            <Label hint="복수 선택">필요한 전문분야</Label>
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => {
                const on = picked.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() =>
                      setPicked((p) => (on ? p.filter((x) => x !== s.id) : [...p, s.id]))
                    }
                    className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
                      on
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-slate-200 text-slate-600"
                    }`}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <ErrorText>{error}</ErrorText>

        <div className="flex gap-2 pt-1">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600"
            >
              이전
            </button>
          )}
          <button
            type="button"
            disabled={!canNext || busy}
            onClick={() => (step < 2 ? setStep((s) => s + 1) : submit())}
            className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
          >
            {busy ? "등록 중…" : step < 2 ? "다음" : "등록하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
