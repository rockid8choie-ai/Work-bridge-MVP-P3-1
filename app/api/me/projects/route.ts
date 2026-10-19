import { prisma } from "@/lib/server/db";
import { fail, ok } from "@/lib/server/api";
import { requireRole } from "@/lib/server/guard";
import { syncRecruitStatuses } from "@/lib/server/projects";

export const runtime = "nodejs";

/** 내 프로젝트 (B-33) — 건물주 전용. 거래 단계 상태는 여기서만 노출한다 (B-17). */
export async function GET() {
  try {
    const user = await requireRole("client");
    await syncRecruitStatuses();

    const projects = await prisma.project.findMany({
      where: { clientId: user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        category: true,
        budget: true,
        deadlineAt: true,
        recruitStatus: true,
        dealStatus: true,
        createdAt: true,
        _count: { select: { applications: { where: { status: "pending" } } } },
        applications: {
          where: { status: "accepted" },
          select: { freelancer: { select: { name: true } } },
          take: 1,
        },
      },
    });

    return ok({
      projects: projects.map((p) => ({
        ...p,
        pendingCount: p._count.applications,
        acceptedFreelancer: p.applications[0]?.freelancer.name ?? null,
      })),
    });
  } catch (error) {
    return fail(error);
  }
}
