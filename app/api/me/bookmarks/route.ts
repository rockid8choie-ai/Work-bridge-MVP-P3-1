import { prisma } from "@/lib/server/db";
import { fail, ok } from "@/lib/server/api";
import { requireRole } from "@/lib/server/guard";
import { projectCardSelect } from "@/lib/server/projects.query";

export const runtime = "nodejs";

/** 내 북마크 (B-27) — 전문가 전용 */
export async function GET() {
  try {
    const user = await requireRole("freelancer");
    const rows = await prisma.bookmark.findMany({
      where: { userId: user.id, project: { deletedAt: null } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, project: { select: projectCardSelect } },
    });
    return ok({ bookmarks: rows });
  } catch (error) {
    return fail(error);
  }
}
