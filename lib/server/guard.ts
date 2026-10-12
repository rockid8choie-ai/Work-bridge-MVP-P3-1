import "server-only";

import type { UserRole } from "@prisma/client";
import { ApiError } from "@/lib/server/api";
import { getCurrentUser, type CurrentUser } from "@/lib/server/auth";

/** 로그인 필수 라우트에서 쓴다. 없으면 401. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "UNAUTHENTICATED", "로그인이 필요합니다");
  return user;
}

/** 역할 제한 — 프로젝트 등록은 건물주만, 지원은 전문가만 (AC 3.1.3) */
export async function requireRole(role: UserRole): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== role) {
    throw new ApiError(
      403,
      "ROLE_FORBIDDEN",
      role === "client" ? "건물주 계정만 이용할 수 있어요" : "전문가 계정만 이용할 수 있어요"
    );
  }
  return user;
}

/**
 * 프로필이 비어 있으면 액션을 막는다.
 * 차단형 흐름이므로 클라이언트가 원래 가려던 곳으로 되돌아올 수 있게
 * 에러 코드로 구분해 준다 (AC B-06).
 */
export function requireProfile(user: CurrentUser) {
  const filled = user.role === "client" ? user.clientProfile : user.vendorProfile;
  if (!filled) {
    throw new ApiError(428, "PROFILE_REQUIRED", "먼저 프로필을 작성해 주세요");
  }
}
