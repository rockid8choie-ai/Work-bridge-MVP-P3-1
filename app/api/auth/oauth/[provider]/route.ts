import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authorizeUrl, createState, isProvider, providerConfigured } from "@/lib/server/oauth";

export const runtime = "nodejs";

/** 소셜 로그인 시작 — 제공자 인증 화면으로 보낸다 (B-03). ?next= 는 로그인 뒤 돌아갈 곳. */
export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const url = new URL(request.url);
  const next = url.searchParams.get("next") || "/";

  if (!isProvider(provider)) return NextResponse.redirect(new URL("/login?error=unknown_provider", url.origin));
  if (!providerConfigured(provider)) return NextResponse.redirect(new URL(`/login?error=${provider}_not_configured`, url.origin));

  const { state, hash } = createState();
  const jar = await cookies();
  const base = { httpOnly: true, sameSite: "lax" as const, path: "/", secure: process.env.NODE_ENV === "production", maxAge: 600 };
  jar.set("wb_oauth_state", hash, base);
  jar.set("wb_oauth_next", next.startsWith("/") ? next : "/", base);

  return NextResponse.redirect(authorizeUrl(provider, url.origin, state));
}
