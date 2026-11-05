import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/server/db";
import { ApiError } from "@/lib/server/api";

/**
 * 소셜 로그인 (B-03, B-04) — Google · Kakao, OAuth 2.0 인증 코드 플로우. 외부 라이브러리 없이 직접 구현.
 * 같은 이메일 가입자가 있으면 새 계정을 만들지 않고 OAuthAccount 로 연결한다.
 * 처음 보는 사용자는 역할이 없으므로 "역할 선택" 화면으로 보낸 뒤 계정을 만든다.
 */

export type Provider = "google" | "kakao";

export const PROVIDERS: Record<Provider, { label: string; authorize: string; token: string; userinfo: string; scope: string }> = {
  google: {
    label: "Google",
    authorize: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token",
    userinfo: "https://openidconnect.googleapis.com/v1/userinfo",
    scope: "openid email profile",
  },
  kakao: {
    label: "카카오",
    authorize: "https://kauth.kakao.com/oauth/authorize",
    token: "https://kauth.kakao.com/oauth/token",
    userinfo: "https://kapi.kakao.com/v2/user/me",
    scope: "", // 동의항목은 카카오 콘솔에서 정한다
  },
};

export function isProvider(p: string): p is Provider {
  return p === "google" || p === "kakao";
}

export function providerConfigured(p: Provider) {
  return Boolean(p === "google" ? process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET : process.env.KAKAO_CLIENT_ID);
}

function creds(p: Provider) {
  const id = p === "google" ? process.env.GOOGLE_CLIENT_ID : process.env.KAKAO_CLIENT_ID;
  const secret = p === "google" ? process.env.GOOGLE_CLIENT_SECRET : process.env.KAKAO_CLIENT_SECRET;
  if (!id) throw new ApiError(503, "OAUTH_NOT_CONFIGURED", `${PROVIDERS[p].label} 로그인 키가 설정되지 않았어요`);
  return { id, secret: secret || "" };
}

export function redirectUri(p: Provider, origin: string) {
  const base = process.env.OAUTH_REDIRECT_BASE || origin;
  return `${base.replace(/\/$/, "")}/api/auth/oauth/${p}/callback`;
}

/** CSRF 방지용 state — 쿠키에 해시를, URL 에 원문을 둔다 */
export function createState() {
  const state = randomBytes(24).toString("base64url");
  return { state, hash: createHash("sha256").update(state).digest("hex") };
}

export function hashState(state: string) {
  return createHash("sha256").update(state).digest("hex");
}

export function authorizeUrl(p: Provider, origin: string, state: string) {
  const { id } = creds(p);
  const u = new URL(PROVIDERS[p].authorize);
  u.searchParams.set("client_id", id);
  u.searchParams.set("redirect_uri", redirectUri(p, origin));
  u.searchParams.set("response_type", "code");
  u.searchParams.set("state", state);
  if (PROVIDERS[p].scope) u.searchParams.set("scope", PROVIDERS[p].scope);
  if (p === "google") u.searchParams.set("prompt", "select_account");
  return u.toString();
}

/** email 은 제공자가 "검증됨" 이라고 준 경우에만 담는다 — 미검증 이메일로 기존 비밀번호 계정에 자동 연결되면 계정 탈취가 된다 (11/5 셀프 리뷰) */
export type SocialProfile = { providerUserId: string; email: string | null; name: string; avatarUrl: string | null };

/** code → access token → 사용자 정보 */
export async function fetchProfile(p: Provider, code: string, origin: string): Promise<SocialProfile> {
  const { id, secret } = creds(p);
  const form = new URLSearchParams({ grant_type: "authorization_code", code, client_id: id, redirect_uri: redirectUri(p, origin) });
  if (secret) form.set("client_secret", secret);

  const tokenRes = await fetch(PROVIDERS[p].token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
    signal: AbortSignal.timeout(15_000),
  });
  const token = (await tokenRes.json().catch(() => ({}))) as { access_token?: string; error?: string; error_description?: string };
  if (!tokenRes.ok || !token.access_token) {
    throw new ApiError(401, "OAUTH_TOKEN_FAILED", token.error_description || `${PROVIDERS[p].label} 인증에 실패했어요`);
  }

  const infoRes = await fetch(PROVIDERS[p].userinfo, {
    headers: { Authorization: `Bearer ${token.access_token}` },
    signal: AbortSignal.timeout(15_000),
  });
  const info = (await infoRes.json().catch(() => ({}))) as Record<string, unknown>;
  if (!infoRes.ok) throw new ApiError(401, "OAUTH_PROFILE_FAILED", `${PROVIDERS[p].label} 사용자 정보를 가져오지 못했어요`);

  if (p === "google") {
    const verified = info.email_verified === true || info.email_verified === "true";
    return {
      providerUserId: String(info.sub),
      email: verified && typeof info.email === "string" ? info.email.toLowerCase() : null,
      name: typeof info.name === "string" && info.name ? info.name : "Google 사용자",
      avatarUrl: typeof info.picture === "string" ? info.picture : null,
    };
  }
  const account = (info.kakao_account ?? {}) as Record<string, unknown>;
  const profile = (account.profile ?? {}) as Record<string, unknown>;
  const kakaoVerified = account.is_email_valid === true && account.is_email_verified === true;
  return {
    providerUserId: String(info.id),
    email: kakaoVerified && typeof account.email === "string" ? account.email.toLowerCase() : null,
    name: typeof profile.nickname === "string" && profile.nickname ? profile.nickname : "카카오 사용자",
    avatarUrl: typeof profile.profile_image_url === "string" ? profile.profile_image_url : null,
  };
}

/**
 * 소셜 프로필로 로그인할 사용자를 찾는다.
 * ① provider+id 로 연결된 계정 → 그 계정  ② 같은 이메일 계정 → 연결하고 그 계정 (B-03)  ③ 없음 → null (역할 선택 필요, B-04)
 */
export async function resolveUser(p: Provider, profile: SocialProfile) {
  const linked = await prisma.oAuthAccount.findUnique({
    where: { provider_providerUserId: { provider: p, providerUserId: profile.providerUserId } },
    include: { user: true },
  });
  if (linked) return linked.user;

  if (profile.email) {
    const byEmail = await prisma.user.findUnique({ where: { email: profile.email } });
    if (byEmail) {
      await prisma.oAuthAccount.create({ data: { userId: byEmail.id, provider: p, providerUserId: profile.providerUserId } });
      if (!byEmail.avatarUrl && profile.avatarUrl) {
        await prisma.user.update({ where: { id: byEmail.id }, data: { avatarUrl: profile.avatarUrl } });
      }
      return byEmail;
    }
  }
  return null;
}

/** 역할을 고른 뒤 계정 생성 + 연결 (B-04). 이메일이 없는 카카오 계정은 provider 기반 대체 이메일을 쓴다. */
export async function createSocialUser(p: Provider, profile: SocialProfile, role: "client" | "freelancer") {
  const email = profile.email ?? `${p}_${profile.providerUserId}@social.workbridge.local`;
  return prisma.user.create({
    data: {
      email,
      name: profile.name.slice(0, 40),
      role,
      passwordHash: null,
      avatarUrl: profile.avatarUrl,
      oauthAccounts: { create: { provider: p, providerUserId: profile.providerUserId } },
    },
  });
}
