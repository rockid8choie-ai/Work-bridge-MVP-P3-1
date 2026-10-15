import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/server/db";
import { ApiError, fail, ok, readJson } from "@/lib/server/api";
import { requireProfile, requireRole } from "@/lib/server/guard";
import { draftApplicationReceived, notifyMany } from "@/lib/server/notify";
import { syncRecruitStatuses } from "@/lib/server/projects";
import { applySchema } from "@/lib/server/validators.application";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** 지원자 목록 — 프로젝트 소유 건물주만 (B-19) */
export async function GET(_: Request, { params }: Ctx) {
  try {
    const user = await requireRole("client");
    const { id } = await params;

    const project = await prisma.project.findFirst({
      where: { id, clientId: user.id, deletedAt: null },
      select: { id: true, title: true, recruitStatus: true, dealStatus: true },
    });
    if (!project) throw new ApiError(404, "NOT_FOUND", "프로젝트를 찾을 수 없어요");

    const applications = await prisma.application.findMany({
      where: { projectId: id },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }], // accepted → pending → rejected
      include: {
        freelancer: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            bio: true,
            vendorProfile: {
              select: {
                mainCategory: true,
                years: true,
                hourlyRate: true,
                portfolioUrl: true,
                skills: { select: { skill: { select: { name: true } } } },
              },
            },
          },
        },
      },
    });

    return ok({
      project,
      applications: applications.map((a) => ({
        id: a.id,
        status: a.status,
        coverLetter: a.coverLetter,
        proposedAmount: a.proposedAmount,
        proposedDays: a.proposedDays,
        createdAt: a.createdAt,
        freelancer: {
          id: a.freelancer.id,
          name: a.freelancer.name,
          avatarUrl: a.freelancer.avatarUrl,
          bio: a.freelancer.bio,
          mainCategory: a.freelancer.vendorProfile?.mainCategory ?? null,
          years: a.freelancer.vendorProfile?.years ?? null,
          hourlyRate: a.freelancer.vendorProfile?.hourlyRate ?? null,
          portfolioUrl: a.freelancer.vendorProfile?.portfolioUrl ?? null,
          skills: a.freelancer.vendorProfile?.skills.map((s) => s.skill.name) ?? [],
        },
      })),
    });
  } catch (error) {
    return fail(error);
  }
}

/**
 * 지원서 제출 — 전문가 전용, 프로필 선행, 모집 중인 프로젝트만, 중복 금지 (B-06, B-18, B-24 ①).
 * 지원 저장과 건물주 알림은 한 트랜잭션.
 */
export async function POST(request: Request, { params }: Ctx) {
  try {
    const user = await requireRole("freelancer");
    requireProfile(user);
    const { id } = await params;
    const body = applySchema.parse(await readJson(request));

    await syncRecruitStatuses(); // 마감일이 지난 프로젝트에 지원되는 일을 막는다

    const project = await prisma.project.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, title: true, clientId: true, recruitStatus: true },
    });
    if (!project) throw new ApiError(404, "NOT_FOUND", "프로젝트를 찾을 수 없어요");
    if (project.recruitStatus !== "open") {
      throw new ApiError(
        409,
        "NOT_RECRUITING",
        project.recruitStatus === "scheduled" ? "아직 모집 전이에요" : "모집이 마감됐어요"
      );
    }

    try {
      const application = await prisma.$transaction(async (tx) => {
        const created = await tx.application.create({
          data: {
            projectId: project.id,
            freelancerId: user.id,
            coverLetter: body.coverLetter,
            proposedAmount: body.proposedAmount,
            proposedDays: body.proposedDays,
          },
          select: { id: true, status: true, createdAt: true },
        });
        await notifyMany(tx, [
          draftApplicationReceived({
            clientId: project.clientId,
            projectId: project.id,
            projectTitle: project.title,
            freelancerName: user.name,
          }),
        ]);
        return created;
      });

      return ok({ application }, 201);
    } catch (e) {
      // @@unique([projectId, freelancerId]) 위반 = 중복 지원 (B-18)
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new ApiError(409, "ALREADY_APPLIED", "이미 지원한 프로젝트예요");
      }
      throw e;
    }
  } catch (error) {
    return fail(error);
  }
}
