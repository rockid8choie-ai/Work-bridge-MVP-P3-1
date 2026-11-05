import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { z } from "zod";
import { ApiError, fail, ok, readJson } from "@/lib/server/api";
import { issueSession } from "@/lib/server/auth";
import { createSocialUser, isProvider, resolveUser, type SocialProfile } from "@/lib/server/oauth";

export const runtime = "nodejs";

const schema = z.object({ role: z.enum(["client", "freelancer"]) });

/** 최초 소셜 로그인 역할 선택 (B-04) — 콜백이 남긴 대기 토큰으로 계정을 만든다 */
export async function GET() {
  const pending = await readPending().catch(() => null);
  return ok({ pending: pending ? { provider: pending.provider, name: pending.profile.name, email: pending.profile.email } : null });
}

export async function POST(request: Request) {
  try {
    const { role } = schema.parse(await readJson(request));
    const pending = await readPending();

    // 그 사이 같은 이메일로 가입했을 수 있다 — 다시 한번 기존 계정을 찾는다
    const user = (await resolveUser(pending.provider, pending.profile)) ?? (await createSocialUser(pending.provider, pending.profile, role));
    await issueSession(user.id, user.role);

    const jar = await cookies();
    const next = jar.get("wb_oauth_next")?.value || "/";
    jar.delete("wb_oauth_pending");
    jar.delete("wb_oauth_next");

    return ok({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, next }, 201);
  } catch (error) {
    return fail(error);
  }
}

async function readPending() {
  const jar = await cookies();
  const token = jar.get("wb_oauth_pending")?.value;
  if (!token) throw new ApiError(401, "NO_PENDING_LOGIN", "소셜 로그인부터 다시 시작해 주세요");
  const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!)).catch(() => {
    throw new ApiError(401, "PENDING_EXPIRED", "시간이 지났어요. 소셜 로그인부터 다시 시작해 주세요");
  });
  const provider = String(payload.provider);
  if (!isProvider(provider)) throw new ApiError(400, "BAD_PENDING", "잘못된 요청이에요");
  return { provider, profile: payload.profile as SocialProfile };
}
