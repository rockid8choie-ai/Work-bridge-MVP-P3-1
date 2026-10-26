"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiPost, ApiRequestError } from "@/lib/client/api";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

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
      await apiPost("/api/auth/login", { email, password });
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "로그인에 실패했어요.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <h1 className="text-h3 text-ink-900">로그인</h1>

      <label className="block">
        <span className="text-label text-ink-700">이메일</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          className="mt-1.5 w-full rounded-control border border-line-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent-500 focus-visible:outline-none"
        />
      </label>

      <label className="block">
        <span className="text-label text-ink-700">비밀번호</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          className="mt-1.5 w-full rounded-control border border-line-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent-500 focus-visible:outline-none"
        />
      </label>

      {error && (
        <p className="rounded-control bg-danger-50 px-3 py-2 text-sm text-danger-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-control bg-ink-900 py-3 text-sm font-bold text-white transition-colors hover:bg-ink-700 disabled:opacity-40"
      >
        {busy ? "확인 중…" : "로그인"}
      </button>

      <p className="text-center text-sm text-ink-500">
        계정이 없나요?{" "}
        <Link href="/signup" className="font-semibold text-accent-600">
          회원가입
        </Link>
      </p>
    </form>
  );
}
