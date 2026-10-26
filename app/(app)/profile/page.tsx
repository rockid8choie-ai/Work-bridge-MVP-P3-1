"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiGet, ApiRequestError } from "@/lib/client/api";
import { ErrorText, inputClass, Label } from "@/components/Field";

const BUILDING_TYPES = ["상가", "오피스", "다세대", "기타"] as const;

type Skill = { id: string; name: string };

export default function ProfilePage() {
  return (
    <Suspense fallback={<p className="text-sm text-ink-400">불러오는 중…</p>}>
      <ProfileForm />
    </Suspense>
  );
}

function ProfileForm() {
  const router = useRouter();
  const params = useSearchParams();
  /** 프로필을 채우러 끌려온 경우 원래 가려던 곳 (AC B-06) */
  const next = params.get("next");

  const [role, setRole] = useState<"client" | "freelancer" | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const [me, sk] = await Promise.all([
        apiGet<{ role: "client" | "freelancer"; profile: Record<string, unknown> | null }>(
          "/api/profile"
        ),
        apiGet<{ skills: Skill[] }>("/api/skills"),
      ]);
      setRole(me.role);
      setSkills(sk.skills);
      if (me.profile) {
        const p = me.profile as Record<string, unknown>;
        setForm(
          Object.fromEntries(
            Object.entries(p)
              .filter(([k]) => k !== "skills" && k !== "userId")
              .map(([k, v]) => [k, v == null ? "" : String(v)])
          )
        );
        if (Array.isArray(p.skills)) setPicked(p.skills as string[]);
      }
    })().catch((e) => setError(e instanceof ApiRequestError ? e.message : "불러오지 못했어요."));
  }, []);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !role) return;
    setBusy(true);
    setError(null);
    try {
      const body =
        role === "client"
          ? {
              buildingName: form.buildingName ?? "",
              buildingType: form.buildingType || "상가",
              region: form.region ?? "",
              website: form.website ?? "",
            }
          : {
              mainCategory: form.mainCategory || skills[0]?.name || "",
              years: form.years ?? "0",
              hourlyRate: form.hourlyRate ?? "0",
              portfolioUrl: form.portfolioUrl ?? "",
              skills: picked,
            };

      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new ApiRequestError(json.code, json.message, json.field);

      // 원래 하려던 일로 돌려보낸다 (차단형 흐름의 복귀 보장)
      if (next) {
        router.push(next);
        router.refresh();
      } else {
        setSaved(true);
        setBusy(false);
      }
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "저장하지 못했어요.");
      setBusy(false);
    }
  };

  if (!role) return <p className="text-sm text-ink-400">불러오는 중…</p>;

  return (
    <form onSubmit={submit} className="max-w-md space-y-5">
      <div>
        <h1 className="text-h2 text-ink-900">내 프로필</h1>
        {next && (
          <p className="mt-1.5 rounded-control bg-accent-50 px-3 py-2 text-sm text-accent-600">
            먼저 프로필을 작성해 주세요. 저장하면 하던 작업으로 돌아갑니다.
          </p>
        )}
      </div>

      {role === "client" ? (
        <>
          <label className="block">
            <Label>건물명</Label>
            <input
              className={inputClass}
              value={form.buildingName ?? ""}
              onChange={(e) => set("buildingName", e.target.value)}
              placeholder="역삼 신원빌딩"
              required
            />
          </label>
          <label className="block">
            <Label>건물 유형</Label>
            <select
              className={inputClass}
              value={form.buildingType ?? "상가"}
              onChange={(e) => set("buildingType", e.target.value)}
            >
              {BUILDING_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <Label>지역</Label>
            <input
              className={inputClass}
              value={form.region ?? ""}
              onChange={(e) => set("region", e.target.value)}
              placeholder="서울 강남구"
              required
            />
          </label>
          <label className="block">
            <Label hint="선택">웹사이트</Label>
            <input
              className={inputClass}
              value={form.website ?? ""}
              onChange={(e) => set("website", e.target.value)}
              placeholder="https://"
            />
          </label>
        </>
      ) : (
        <>
          <label className="block">
            <Label>주요 분야</Label>
            <select
              className={inputClass}
              value={form.mainCategory ?? ""}
              onChange={(e) => set("mainCategory", e.target.value)}
            >
              <option value="">선택해 주세요</option>
              {skills.map((s) => (
                <option key={s.id}>{s.name}</option>
              ))}
            </select>
          </label>

          <div>
            <Label hint="복수 선택">전문분야</Label>
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
                        ? "border-accent-500 bg-accent-50 text-accent-600"
                        : "border-line-200 text-ink-700"
                    }`}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <Label>경력(년)</Label>
              <input
                type="number"
                min={0}
                className={inputClass}
                value={form.years ?? ""}
                onChange={(e) => set("years", e.target.value)}
                required
              />
            </label>
            <label className="block">
              <Label>시간당 단가(원)</Label>
              <input
                type="number"
                min={0}
                step={1000}
                className={inputClass}
                value={form.hourlyRate ?? ""}
                onChange={(e) => set("hourlyRate", e.target.value)}
                required
              />
            </label>
          </div>

          <label className="block">
            <Label hint="선택">포트폴리오 URL</Label>
            <input
              className={inputClass}
              value={form.portfolioUrl ?? ""}
              onChange={(e) => set("portfolioUrl", e.target.value)}
              placeholder="https://"
            />
          </label>
        </>
      )}

      <ErrorText>{error}</ErrorText>
      {saved && <p className="text-sm font-semibold text-ok-600">저장했어요.</p>}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-control bg-ink-900 py-3 text-sm font-bold text-white transition-colors hover:bg-ink-700 disabled:opacity-40"
      >
        {busy ? "저장 중…" : next ? "저장하고 계속하기" : "저장"}
      </button>
    </form>
  );
}
