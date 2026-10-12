import { getCurrentUser, hasProfile } from "@/lib/server/auth";
import { fail, ok } from "@/lib/server/api";

export const runtime = "nodejs";

// 현재 세션. Access 가 만료됐으면 내부에서 Refresh 로 자동 재발급된다 (AC B-02)
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return ok({ user: null });
    return ok({ user, profileComplete: hasProfile(user) });
  } catch (error) {
    return fail(error);
  }
}
