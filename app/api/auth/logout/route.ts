import { revokeSession } from "@/lib/server/auth";
import { fail, ok } from "@/lib/server/api";

export const runtime = "nodejs";

// 로그아웃 — 쿠키 삭제 + 서버 측 Refresh 무효화 (AC B-01)
export async function POST() {
  try {
    await revokeSession();
    return ok({ loggedOut: true });
  } catch (error) {
    return fail(error);
  }
}
