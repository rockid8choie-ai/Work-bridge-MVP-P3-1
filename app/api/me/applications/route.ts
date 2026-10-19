import { prisma } from "@/lib/server/db";
import { fail, ok } from "@/lib/server/api";
import { requireRole } from "@/lib/server/guard";

export const runtime = "nodejs";

/** 내 지원 현황 (B-22) — 거절·수락 뒤에도 행이 남는다. 거래 단계도 여기서는 보인다 (B-17 내부 화면). */
export async function GET() {
  try {
    const user = await requireRole("freelancer");
    const applications = await prisma.application.findMany({
      where: { freelancerId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            category: true,
            budget: true,
            deadlineAt: true,
            recruitStatus: true,
            dealStatus: true,
            deletedAt: true,
            client: { select: { name: true } },
          },
        },
      },
    });
    return ok({ applications });
  } catch (error) {
    return fail(error);
  }
}
