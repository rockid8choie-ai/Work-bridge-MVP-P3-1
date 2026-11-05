import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SignJWT } from "jose";
import { issueSession } from "@/lib/server/auth";
import { fetchProfile, hashState, isProvider, resolveUser } from "@/lib/server/oauth";

export const runtime = "nodejs";

/**
 * 제공자 콜백 (B-03, B-04).
 * state 검증 → 토큰·프로필 교환 → 기존 계정이면 바로 로그인, 처음이면 프로필을 짧은 서명 토큰에 담아 역할 선택 화면으로.
 */
export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const url = new URL(request.url);
  const jar = await cookies();
  const next = jar.get("wb_oauth_next")?.value || "/";
  const fail = (code: string) => NextResponse.redirect(new URL(`/login?error=${code}`, url.origin));

  if (!isProvider(provider)) return fail("unknown_provider");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expected = jar.get("wb_oauth_state")?.value;
  jar.delete("wb_oauth_state");
  if (!code || !state || !expected || hashState(state) !== expected) return fail("state_mismatch");

  try {
    const profile = await fetchProfile(provider, code, url.origin);
    const user = await resolveUser(provider, profile);

    if (user) {
      await issueSession(user.id, user.role);
      jar.delete("wb_oauth_next");
      return NextResponse.redirect(new URL(next, url.origin));
    }

    // 처음 보는 사용자 → 역할 선택 (B-04). 프로필은 10분짜리 서명 토큰으로만 넘긴다 — 쿼리스트링에 이메일을 싣지 않는다.
    const token = await new SignJWT({ provider, profile })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("10m")
      .sign(new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!));
    jar.set("wb_oauth_pending", token, { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production", maxAge: 600 });
    return NextResponse.redirect(new URL("/onboarding/role", url.origin));
  } catch (e) {
    console.warn("[oauth] 실패:", e instanceof Error ? e.message : e);
    return fail(`${provider}_failed`);
  }
}
