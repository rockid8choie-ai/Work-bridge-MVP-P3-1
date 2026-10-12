import { prisma } from "@/lib/server/db";
import { issueSession, verifyPassword } from "@/lib/server/auth";
import { ApiError, fail, ok, readJson } from "@/lib/server/api";
import { loginSchema } from "@/lib/server/validators";

export const runtime = "nodejs";

// 로그인 — Access + Refresh 발급 (AC B-01, B-02)
export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await readJson(request));

    const user = await prisma.user.findUnique({ where: { email: body.email } });

    // 계정 없음과 비밀번호 틀림을 구분해 주지 않는다 — 이메일 존재 여부 탐지 방지
    const invalid = new ApiError(401, "INVALID_CREDENTIALS", "이메일 또는 비밀번호가 올바르지 않습니다");
    if (!user?.passwordHash) throw invalid;
    if (!(await verifyPassword(body.password, user.passwordHash))) throw invalid;

    await issueSession(user.id, user.role);

    return ok({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    return fail(error);
  }
}
