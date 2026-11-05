"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, ApiRequestError } from "@/lib/client/api";

type Role = "client" | "freelancer";
const ROLES: { value: Role; label: string; desc: string }[] = [
  { value: "client", label: "건물주", desc: "건물 보수를 맡기고 싶어요" },
  { value: "freelancer", label: "전문가", desc: "보수 일감을 받고 싶어요" },
];

/** 최초 소셜 로그인 → 역할 선택 (B-04). 역할은 가입 후 바꿀 수 없다. */
export default function RoleOnboardingPage() {
  const router = useRouter();
  const [pending, setPending] = useState<{ provider: string; name: string; email: string | null } | null | undefined>(undefined);
  const [role, setRole] = useState<Role>("client");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ pending: typeof pending }>("/api/auth/role")
      .then((d) => setPending(d.pending ?? null))
      .catch(() => setPending(null));
  }, []);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const { next } = await apiPost<{ next: string }>("/api/auth/role", { role });
      router.push(next || "/");
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "가입하지 못했어요.");
      setBusy(false);
    }
  };

  if (pending === undefined) return <p className="text-sm text-ink-400">확인 중…</p>;
  if (pending === null) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm text-ink-700">소셜 로그인 정보가 없어요. 다시 시작해 주세요.</p>
        <a href="/login" className="btn-primary inline-block px-4 py-2 text-sm">로그인으로</a>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-h3 text-ink-900">거의 다 됐어요</h1>
        <p className="mt-1 text-sm text-ink-500">
          {pending.provider === "google" ? "Google" : "카카오"} 계정 <b className="text-ink-700">{pending.name}</b>
          {pending.email && ` (${pending.email})`} 로 처음 오셨네요. 어떤 역할로 쓰실 건가요? 역할은 나중에 바꿀 수 없어요.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {ROLES.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => setRole(r.value)}
            className={`rounded-control border p-3 text-left transition-colors ${role === r.value ? "border-accent-500 bg-accent-50" : "border-line-200"}`}
          >
            <span className="block font-bold text-ink-900">{r.label}</span>
            <span className="mt-0.5 block text-[12.5px] text-ink-500">{r.desc}</span>
          </button>
        ))}
      </div>
      {error && <p className="rounded-control bg-danger-50 px-3 py-2 text-sm text-danger-600">{error}</p>}
      <button type="button" disabled={busy} onClick={submit} className="btn-primary w-full py-3 text-sm">
        {busy ? "만드는 중…" : `${ROLES.find((r) => r.value === role)!.label}로 시작하기`}
      </button>
    </div>
  );
}
