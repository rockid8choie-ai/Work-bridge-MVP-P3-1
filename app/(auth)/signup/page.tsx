"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiPost, ApiRequestError } from "@/lib/client/api";

type Role = "client" | "freelancer";

const ROLES: { value: Role; label: string; desc: string }[] = [
  { value: "client", label: "건물주", desc: "건물 보수를 맡기고 싶어요" },
  { value: "freelancer", label: "전문가", desc: "보수 일감을 받고 싶어요" },
];

/** useSearchParams 는 Suspense 경계가 필요하다 — 빌드 시 정적 렌더링 오류를 피하기 위한 래퍼 */
export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  // 랜딩의 "건물주로 시작 / 전문가로 시작" 버튼이 ?role= 로 넘긴다 (B-29)
  const preset = params.get("role");
  const [role, setRole] = useState<Role>(preset === "freelancer" ? "freelancer" : "client");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await apiPost("/api/auth/signup", { name, email, password, role });
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "가입에 실패했어요.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-900">회원가입</h1>
        <p className="mt-1 text-sm text-slate-500">역할은 가입 후에 바꿀 수 없어요.</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {ROLES.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => setRole(r.value)}
            className={`rounded-xl border p-3 text-left transition-colors ${
              role === r.value
                ? "border-blue-600 bg-blue-50"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <span className="block text-sm font-bold text-slate-900">{r.label}</span>
            <span className="mt-0.5 block text-xs leading-snug text-slate-500">{r.desc}</span>
          </button>
        ))}
      </div>

      <Field label="이름" value={name} onChange={setName} autoComplete="name" required />
      <Field
        label="이메일"
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="email"
        required
      />
      <Field
        label="비밀번호"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        hint="8자 이상"
        required
      />

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
      >
        {busy ? "가입 중…" : "가입하기"}
      </button>

      <p className="text-center text-sm text-slate-500">
        이미 계정이 있나요?{" "}
        <Link href="/login" className="font-semibold text-blue-600">
          로그인
        </Link>
      </p>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  hint,
  type = "text",
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  type?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type">) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {hint && <span className="ml-1.5 text-xs text-slate-400">{hint}</span>}
      <input
        {...rest}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-blue-600"
      />
    </label>
  );
}
