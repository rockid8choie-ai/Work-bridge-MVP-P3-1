"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiGet, apiSend, ApiRequestError } from "@/lib/client/api";
import { ErrorText, inputClass, Label } from "@/components/Field";
import { PROJECT_CATEGORIES } from "@/lib/shared/labels";

type Skill = { id: string; name: string };
type Loaded = {
  project: {
    title: string;
    description: string;
    category: string;
    recruitStartAt: string | null;
    deadlineAt: string;
    budget: number | null;
    skills: string[];
    applicationCount: number;
    lockedFields: string[];
  };
};

const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

/** 프로젝트 수정 (B-08) — 지원자가 있으면 예산·마감일은 잠긴다 */
export default function EditProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loaded, setLoaded] = useState<Loaded["project"] | null>(null);
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
    apiGet<{ skills: Skill[] }>("/api/skills").then((d) => setSkills(d.skills)).catch(() => {});
    apiGet<Loaded>(`/api/projects/${id}`)
      .then(({ project }) => {
        setLoaded(project);
        setTitle(project.title);
        setDescription(project.description);
        setCategory(project.category);
        setRecruitStartAt(toDateInput(project.recruitStartAt));
        setDeadlineAt(toDateInput(project.deadlineAt));
        setBudget(project.budget == null ? "" : String(project.budget));
        setPicked(project.skills);
      })
      .catch((e) => setError(e instanceof ApiRequestError ? e.message : "불러오지 못했어요."));
  }, [id]);

  const locked = (f: string) => loaded?.lockedFields.includes(f) ?? false;
  const canSave = title.trim().length >= 5 && description.trim().length >= 20 && category && deadlineAt && picked.length > 0;

  const save = async () => {
    if (busy || !canSave) return;
    setBusy(true);
    setError(null);
    try {
      await apiSend("PATCH", `/api/projects/${id}`, {
        title,
        description,
        category,
        recruitStartAt: recruitStartAt ? new Date(recruitStartAt).toISOString() : null,
        skills: picked,
        ...(!locked("deadlineAt") && { deadlineAt: new Date(deadlineAt).toISOString() }),
        ...(!locked("budget") && { budget: budget === "" ? null : Number(budget) }),
      });
      router.push(`/projects/${id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "저장하지 못했어요.");
      setBusy(false);
    }
  };

  if (!loaded && !error) return <p className="py-10 text-center text-sm text-ink-400">불러오는 중…</p>;

  return (
    <div className="max-w-xl">
      <Link href={`/projects/${id}`} className="text-sm font-semibold text-ink-400">
        ← 프로젝트
      </Link>
      <h1 className="mt-3 text-h2 text-ink-900">공사 수정</h1>

      {loaded && loaded.applicationCount > 0 && (
        <p className="mt-3 rounded-control bg-warn-50 px-4 py-3 text-[13px] leading-relaxed text-warn-700">
          지원자가 {loaded.applicationCount}명 있어 <b>예산과 마감일은 바꿀 수 없어요.</b> 지원자가 본 조건이 바뀌면
          안 되기 때문입니다.
        </p>
      )}

      <div className="mt-6 space-y-5">
        <label className="block">
          <Label hint="5자 이상">제목</Label>
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="block">
          <Label hint="20자 이상">어떤 공사인가요?</Label>
          <textarea rows={6} className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <label className="block">
          <Label>카테고리</Label>
          <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)}>
            {PROJECT_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <Label hint="비우면 즉시 모집">모집 시작일</Label>
            <input type="date" className={inputClass} value={recruitStartAt} onChange={(e) => setRecruitStartAt(e.target.value)} />
          </label>
          <label className="block">
            <Label hint={locked("deadlineAt") ? "잠김" : undefined}>모집 마감일</Label>
            <input
              type="date"
              className={`${inputClass} disabled:bg-canvas-50 disabled:text-ink-400`}
              disabled={locked("deadlineAt")}
              value={deadlineAt}
              onChange={(e) => setDeadlineAt(e.target.value)}
            />
          </label>
        </div>
        <label className="block">
          <Label hint={locked("budget") ? "잠김" : "비우면 미정"}>예산(원)</Label>
          <input
            type="number"
            min={0}
            step={100000}
            className={`${inputClass} disabled:bg-canvas-50 disabled:text-ink-400`}
            disabled={locked("budget")}
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
          />
        </label>
        <div>
          <Label hint="복수 선택">필요한 전문분야</Label>
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => {
              const on = picked.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setPicked((p) => (on ? p.filter((x) => x !== s.id) : [...p, s.id]))}
                  className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
                    on ? "border-accent-500 bg-accent-50 text-accent-600" : "border-line-200 text-ink-700"
                  }`}
                >
                  {s.name}
                </button>
              );
            })}
          </div>
        </div>

        <ErrorText>{error}</ErrorText>

        <button
          type="button"
          disabled={!canSave || busy}
          onClick={save}
          className="w-full rounded-control bg-ink-900 py-3 text-sm font-bold text-white transition-colors hover:bg-ink-700 disabled:opacity-40"
        >
          {busy ? "저장 중…" : "저장"}
        </button>
      </div>
    </div>
  );
}
