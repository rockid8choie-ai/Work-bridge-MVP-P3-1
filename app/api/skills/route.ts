import { prisma } from "@/lib/server/db";
import { fail, ok } from "@/lib/server/api";

export const runtime = "nodejs";

// 전문분야 목록 — 프로필·프로젝트 등록 양쪽에서 쓴다
export async function GET() {
  try {
    const skills = await prisma.skill.findMany({
      orderBy: [{ isCustom: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    });
    return ok({ skills });
  } catch (error) {
    return fail(error);
  }
}
