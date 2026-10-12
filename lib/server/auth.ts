import "server-only";

import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/server/db";
import {
  createRefreshToken,
  hashRefreshToken,
  refreshExpiryDate,
  signAccessToken,
  verifyAccessToken,
} from "@/lib/server/jwt";

export const ACCESS_COOKIE = "wb_access";
export const REFRESH_COOKIE = "wb_refresh";

const BCRYPT_ROUNDS = 12;

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

/**
 * 로그인 성공 시 두 토큰을 발급하고 쿠키에 심는다.
 * Refresh 는 DB에 해시로 남겨 로그아웃·탈취 시 무효화할 수 있게 한다.
 */
export async function issueSession(userId: string, role: UserRole) {
  const access = await signAccessToken(userId, role);
  const { token: refresh, tokenHash } = createRefreshToken();
  const expiresAt = refreshExpiryDate();

  await prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });

  const jar = await cookies();
  const base = { httpOnly: true, sameSite: "lax" as const, path: "/", secure: process.env.NODE_ENV === "production" };
  jar.set(ACCESS_COOKIE, access, { ...base, maxAge: 60 * 15 });
  jar.set(REFRESH_COOKIE, refresh, { ...base, expires: expiresAt });

  return { access, refresh };
}

/** 로그아웃 — 쿠키를 지우고 해당 refresh 토큰을 DB에서 무효화한다. */
export async function revokeSession() {
  const jar = await cookies();
  const refresh = jar.get(REFRESH_COOKIE)?.value;

  if (refresh) {
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashRefreshToken(refresh), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}

/**
 * 현재 사용자. Access 가 살아 있으면 서명 검증만으로 끝나고,
 * 만료됐으면 Refresh 로 조용히 재발급한다 (AC B-02).
 */
export async function getCurrentUser() {
  const jar = await cookies();

  const access = jar.get(ACCESS_COOKIE)?.value;
  if (access) {
    const payload = await verifyAccessToken(access);
    if (payload) return loadUser(payload.sub);
  }

  const refresh = jar.get(REFRESH_COOKIE)?.value;
  if (!refresh) return null;

  const row = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashRefreshToken(refresh) },
    include: { user: true },
  });
  if (!row || row.revokedAt || row.expiresAt < new Date()) return null;

  // 회전(rotation): 쓴 토큰은 버리고 새로 발급한다
  await prisma.refreshToken.update({ where: { id: row.id }, data: { revokedAt: new Date() } });
  await issueSession(row.user.id, row.user.role);

  return loadUser(row.user.id);
}

async function loadUser(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatarUrl: true,
      bio: true,
      clientProfile: { select: { userId: true } },
      vendorProfile: { select: { userId: true } },
    },
  });
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof loadUser>>>;

/** 역할별 프로필이 채워졌는지 — 비어 있으면 액션 전에 입력 페이지로 보낸다 (AC B-06) */
export function hasProfile(user: CurrentUser) {
  return user.role === "client" ? Boolean(user.clientProfile) : Boolean(user.vendorProfile);
}
