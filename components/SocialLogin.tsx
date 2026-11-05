"use client";

import { useSearchParams } from "next/navigation";

const ERRORS: Record<string, string> = {
  google_not_configured: "Google 로그인 키가 아직 설정되지 않았어요.",
  kakao_not_configured: "카카오 로그인 키가 아직 설정되지 않았어요.",
  state_mismatch: "로그인 요청이 만료됐어요. 다시 시도해 주세요.",
  google_failed: "Google 로그인에 실패했어요.",
  kakao_failed: "카카오 로그인에 실패했어요.",
};

/** 로그인·가입 화면 공용 소셜 버튼 (B-03). 서버 라우트로 보내면 제공자 화면으로 넘어간다. */
export default function SocialLogin({ next, enabled }: { next?: string; enabled: { google: boolean; kakao: boolean } }) {
  const params = useSearchParams();
  const err = params.get("error");
  const q = next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-[12px] text-ink-400">
        <span className="h-px flex-1 bg-line-200" />
        또는
        <span className="h-px flex-1 bg-line-200" />
      </div>
      <a
        href={`/api/auth/oauth/google${q}`}
        className={`flex w-full items-center justify-center gap-2 rounded-control border border-line-200 bg-paper py-2.5 text-sm font-semibold text-ink-900 ${enabled.google ? "hover:bg-canvas-50" : "opacity-50"}`}
        aria-disabled={!enabled.google}
        title={enabled.google ? undefined : "키 설정 전"}
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.5 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.8 6C12.3 13.5 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.4 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.7l7.8-6z"/><path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2.1 1.4-4.7 2.2-7.7 2.2-6.3 0-11.7-4-13.6-9.7l-7.8 6C6.5 42.6 14.6 48 24 48z"/></svg>
        Google로 계속하기
      </a>
      <a
        href={`/api/auth/oauth/kakao${q}`}
        className={`flex w-full items-center justify-center gap-2 rounded-control py-2.5 text-sm font-semibold text-[#191919] ${enabled.kakao ? "bg-[#FEE500] hover:brightness-95" : "bg-[#FEE500] opacity-50"}`}
        aria-disabled={!enabled.kakao}
        title={enabled.kakao ? undefined : "키 설정 전"}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden><path fill="#191919" d="M12 3C6.5 3 2 6.5 2 10.8c0 2.7 1.8 5.1 4.5 6.5l-1 3.8c-.1.3.3.6.5.4l4.4-2.9c.5.1 1 .1 1.6.1 5.5 0 10-3.5 10-7.9S17.5 3 12 3z"/></svg>
        카카오로 계속하기
      </a>
      {err && <p className="rounded-control bg-danger-50 px-3 py-2 text-sm text-danger-600">{ERRORS[err] ?? "소셜 로그인에 실패했어요."}</p>}
    </div>
  );
}
