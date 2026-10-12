import { prisma } from "@/lib/server/db";
import { hashPassword, issueSession } from "@/lib/server/auth";
import { ApiError, fail, ok, readJson } from "@/lib/server/api";
import { signupSchema } from "@/lib/server/validators";

export const runtime = "nodejs";

// 회원가입 — 비밀번호는 해싱 저장, 이메일 중복 검증 (AC B-01)
export async function POST(request: Request) {
  try {
    const body = signupSchema.parse(await readJson(request));

    const exists = await prisma.user.findUnique({
      where: { email: body.email },
      select: { id: true },
    });
    if (exists) {
      throw new ApiError(409, "EMAIL_TAKEN", "이미 가입된 이메일입니다");
    }

    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        role: body.role,
        passwordHash: await hashPassword(body.password),
      },
      select: { id: true, email: true, name: true, role: true },
    });

    await issueSession(user.id, user.role);

    return ok({ user }, 201);
  } catch (error) {
    return fail(error);
  }
}
