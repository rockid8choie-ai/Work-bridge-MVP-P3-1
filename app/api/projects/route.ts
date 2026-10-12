import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/server/db";
import { fail, ok, readJson } from "@/lib/server/api";
import { requireProfile, requireRole } from "@/lib/server/guard";
import {
  createProjectSchema,
  PAGE_SIZE,
  projectQuerySchema,
} from "@/lib/server/validators.project";

export const runtime = "nodejs";

/**
 * 프로젝트 목록 — 검색·필터·정렬·페이지네이션 (AC B-11 ~ B-14).
 * 외부 목록이므로 recruitStatus 만 노출하고 거래 단계는 내보내지 않는다 (AC B-17).
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = projectQuerySchema.parse(Object.fromEntries(url.searchParams));

    const where: Prisma.ProjectWhereInput = {
      deletedAt: null,
      ...(query.status && { recruitStatus: query.status }),
      ...(query.category && { category: query.category }),
      ...(query.skill && { skills: { some: { skill: { name: query.skill } } } }),
      ...(query.deadlineBefore && { deadlineAt: { lte: new Date(query.deadlineBefore) } }),
      ...((query.budgetMin !== undefined || query.budgetMax !== undefined) && {
        budget: {
          ...(query.budgetMin !== undefined && { gte: query.budgetMin }),
          ...(query.budgetMax !== undefined && { lte: query.budgetMax }),
        },
      }),
      ...(query.q && {
        OR: [
          { title: { contains: query.q, mode: "insensitive" } },
          { description: { contains: query.q, mode: "insensitive" } },
        ],
      }),
    };

    const orderBy: Prisma.ProjectOrderByWithRelationInput =
      query.sort === "deadline"
        ? { deadlineAt: "asc" }
        : query.sort === "budget"
          ? { budget: "desc" }
          : { createdAt: "desc" };

    const [total, rows] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          title: true,
          category: true,
          budget: true,
          deadlineAt: true,
          recruitStatus: true,
          createdAt: true,
          skills: { select: { skill: { select: { name: true } } } },
          _count: { select: { applications: true } },
          client: { select: { name: true, clientProfile: { select: { region: true } } } },
        },
      }),
    ]);

    return ok({
      projects: rows.map((p) => ({
        id: p.id,
        title: p.title,
        category: p.category,
        budget: p.budget,
        deadlineAt: p.deadlineAt,
        recruitStatus: p.recruitStatus,
        skills: p.skills.map((s) => s.skill.name),
        applicationCount: p._count.applications,
        clientName: p.client.name,
        region: p.client.clientProfile?.region ?? null,
      })),
      page: query.page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    });
  } catch (error) {
    return fail(error);
  }
}

/** 프로젝트 등록 — 건물주 전용, 프로필 선행 필수 (AC B-06, B-07) */
export async function POST(request: Request) {
  try {
    const user = await requireRole("client");
    requireProfile(user);

    const body = createProjectSchema.parse(await readJson(request));
    const now = new Date();
    const startAt = body.recruitStartAt ? new Date(body.recruitStartAt) : null;

    // 시작일이 없거나 이미 지났으면 바로 모집 중 (AC B-15)
    const recruitStatus = !startAt || startAt <= now ? "open" : "scheduled";

    const project = await prisma.project.create({
      data: {
        clientId: user.id,
        title: body.title,
        description: body.description,
        category: body.category,
        recruitStartAt: startAt,
        deadlineAt: new Date(body.deadlineAt),
        budget: body.budget ?? null,
        recruitStatus,
        skills: { create: body.skills.map((skillId) => ({ skillId })) },
      },
      select: { id: true, title: true, recruitStatus: true },
    });

    return ok({ project }, 201);
  } catch (error) {
    return fail(error);
  }
}
