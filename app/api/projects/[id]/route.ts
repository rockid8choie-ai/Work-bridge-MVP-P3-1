import { prisma } from "@/lib/server/db";
import { ApiError, fail, ok, readJson } from "@/lib/server/api";
import { requireRole } from "@/lib/server/guard";
import { softDeleteProject } from "@/lib/server/projects";
import { updateProjectSchema } from "@/lib/server/validators.project";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** 수정용 단건 조회 — 본인 프로젝트만 (B-08) */
export async function GET(_: Request, { params }: Ctx) {
  try {
    const user = await requireRole("client");
    const { id } = await params;

    const project = await prisma.project.findFirst({
      where: { id, clientId: user.id, deletedAt: null },
      include: {
        skills: { select: { skillId: true } },
        _count: { select: { applications: true } },
      },
    });
    if (!project) throw new ApiError(404, "NOT_FOUND", "프로젝트를 찾을 수 없어요");

    return ok({
      project: {
        ...project,
        skills: project.skills.map((s) => s.skillId),
        applicationCount: project._count.applications,
        lockedFields: project._count.applications > 0 ? ["budget", "deadlineAt"] : [],
      },
    });
  } catch (error) {
    return fail(error);
  }
}

/**
 * 프로젝트 수정 (B-08).
 * 지원자가 한 명이라도 있으면 예산·마감일은 못 바꾼다 — 지원자가 본 조건이 뒤바뀌면 안 되기 때문.
 * 거래가 시작된 뒤에는 수정 자체를 막는다.
 */
export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const user = await requireRole("client");
    const { id } = await params;
    const body = updateProjectSchema.parse(await readJson(request));

    const project = await prisma.project.findFirst({
      where: { id, clientId: user.id, deletedAt: null },
      select: {
        budget: true,
        deadlineAt: true,
        dealStatus: true,
        _count: { select: { applications: true } },
      },
    });
    if (!project) throw new ApiError(404, "NOT_FOUND", "프로젝트를 찾을 수 없어요");
    if (project.dealStatus && project.dealStatus !== "cancelled") {
      throw new ApiError(409, "IN_DEAL", "거래가 진행 중인 프로젝트는 수정할 수 없어요");
    }

    if (project._count.applications > 0) {
      const budgetChanged = body.budget !== undefined && (body.budget ?? null) !== project.budget;
      const deadlineChanged =
        body.deadlineAt !== undefined &&
        new Date(body.deadlineAt).getTime() !== project.deadlineAt.getTime();
      if (budgetChanged || deadlineChanged) {
        throw new ApiError(
          409,
          "LOCKED_FIELDS",
          "지원자가 있는 프로젝트는 예산과 마감일을 바꿀 수 없어요"
        );
      }
    }

    const now = new Date();
    const startAt =
      body.recruitStartAt === undefined
        ? undefined
        : body.recruitStartAt
          ? new Date(body.recruitStartAt)
          : null;

    const updated = await prisma.$transaction(async (tx) => {
      if (body.skills) {
        await tx.projectSkill.deleteMany({ where: { projectId: id } });
        await tx.projectSkill.createMany({
          data: body.skills.map((skillId) => ({ projectId: id, skillId })),
          skipDuplicates: true,
        });
      }
      return tx.project.update({
        where: { id },
        data: {
          ...(body.title !== undefined && { title: body.title }),
          ...(body.description !== undefined && { description: body.description }),
          ...(body.category !== undefined && { category: body.category }),
          ...(startAt !== undefined && {
            recruitStartAt: startAt,
            // 시작일을 앞당기면 즉시 모집 중, 미래로 미루면 모집 예정 (B-15)
            recruitStatus: !startAt || startAt <= now ? "open" : "scheduled",
          }),
          ...(body.deadlineAt !== undefined && { deadlineAt: new Date(body.deadlineAt) }),
          ...(body.budget !== undefined && { budget: body.budget ?? null }),
        },
        select: { id: true, title: true, recruitStatus: true },
      });
    });

    return ok({ project: updated });
  } catch (error) {
    return fail(error);
  }
}

/** 소프트 삭제 (B-09) — 물리 삭제는 하지 않는다 */
export async function DELETE(_: Request, { params }: Ctx) {
  try {
    const user = await requireRole("client");
    const { id } = await params;
    const result = await softDeleteProject(id, user.id);
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}
