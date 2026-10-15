import { prisma } from "@/lib/server/db";
import { ApiError, fail, ok } from "@/lib/server/api";
import { requireRole } from "@/lib/server/guard";
import { closeRecruitingTx } from "@/lib/server/projects";

export const runtime = "nodejs";

/** 건물주 수동 모집 마감 (B-21, B-24 ⑤) — 미처리 지원 일괄 거절 + 지원자 전원 알림 */
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole("client");
    const { id } = await params;

    const owned = await prisma.project.findFirst({
      where: { id, clientId: user.id, deletedAt: null },
      select: { recruitStatus: true },
    });
    if (!owned) throw new ApiError(404, "NOT_FOUND", "프로젝트를 찾을 수 없어요");
    if (owned.recruitStatus === "closed") throw new ApiError(409, "ALREADY_CLOSED", "이미 마감된 프로젝트예요");

    const project = await prisma.$transaction((tx) => closeRecruitingTx(tx, id));
    return ok({ project });
  } catch (error) {
    return fail(error);
  }
}
