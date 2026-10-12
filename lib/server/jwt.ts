import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import type { UserRole } from "@prisma/client";

/**
 * 자체 JWT — Access / Refresh 2종 (AC B-02).
 *
 * Access  : 짧게 살고 메모리/쿠키로만 돈다. 검증은 서명만으로 끝난다(DB 조회 없음).
 * Refresh : 길게 살고 DB에 해시로 저장한다. 평문을 저장하면 DB 유출 시 그대로 세션 탈취다.
 */

const enc = new TextEncoder();

function secret(name: "JWT_ACCESS_SECRET" | "JWT_REFRESH_SECRET") {
  const v = process.env[name];
  if (!v) throw new Error(`${name} 가 설정되지 않았습니다. .env 를 확인하세요.`);
  return enc.encode(v);
}

export const ACCESS_TTL = process.env.ACCESS_TOKEN_TTL || "15m";
export const REFRESH_TTL = process.env.REFRESH_TOKEN_TTL || "14d";

export interface AccessPayload {
  sub: string;
  role: UserRole;
}

export async function signAccessToken(userId: string, role: UserRole) {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TTL)
    .sign(secret("JWT_ACCESS_SECRET"));
}

export async function verifyAccessToken(token: string): Promise<AccessPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret("JWT_ACCESS_SECRET"));
    if (!payload.sub || !payload.role) return null;
    return { sub: payload.sub, role: payload.role as UserRole };
  } catch {
    return null; // 만료·위조 모두 여기로 — 호출부가 refresh 로 넘긴다
  }
}

/** Refresh 토큰은 JWT 가 아니라 난수다. 의미를 담지 않으니 서명할 이유가 없다. */
export function createRefreshToken() {
  const token = randomBytes(48).toString("base64url");
  return { token, tokenHash: hashRefreshToken(token) };
}

export function hashRefreshToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function refreshExpiryDate() {
  const days = Number.parseInt(REFRESH_TTL, 10) || 14;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
