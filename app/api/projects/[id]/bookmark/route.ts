import { prisma } from "@/lib/server/db";
import { ApiError, fail, ok } from "@/lib/server/api";
import { requireRole } from "@/lib/server/guard";

export const runtime = "nodejs";

/** 북마크 토글 (B-27) — 전문가 전용. 있으면 지우고 없으면 만든다. */
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole("freelancer");
    const { id } = await params;

    const project = await prisma.project.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
    if (!project) throw new ApiError(404, "NOT_FOUND", "프로젝트를 찾을 수 없어요");

    const key = { userId_projectId: { userId: user.id, projectId: id } };
    const existing = await prisma.bookmark.findUnique({ where: key });

    if (existing) {
      await prisma.bookmark.delete({ where: key });
      return ok({ bookmarked: false });
    }
    await prisma.bookmark.create({ data: { userId: user.id, projectId: id } });
    return ok({ bookmarked: true });
  } catch (error) {
    return fail(error);
  }
}
