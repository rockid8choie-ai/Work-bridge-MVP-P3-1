import "server-only";

import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import type { projectQuerySchema } from "@/lib/server/validators.project";

/**
 * 목록 질의 조립 (B-11 ~ B-14).
 * API(/api/projects)와 화면(/projects)이 같은 where 를 쓰게 한 곳에 둔다 — 둘이 어긋나면 화면과 API 결과가 달라진다.
 * 외부 목록이므로 recruitStatus 만 필터·노출하고 거래 단계는 다루지 않는다 (B-17).
 */

export type ProjectQuery = z.infer<typeof projectQuerySchema>;

export function buildProjectWhere(query: ProjectQuery): Prisma.ProjectWhereInput {
  return {
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
}

export function buildProjectOrderBy(sort: ProjectQuery["sort"]): Prisma.ProjectOrderByWithRelationInput[] {
  // 예산 미정(null)은 예산 높은순에서 맨 뒤로
  if (sort === "deadline") return [{ deadlineAt: "asc" }, { createdAt: "desc" }];
  if (sort === "budget") return [{ budget: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }];
  return [{ createdAt: "desc" }];
}

export const projectCardSelect = {
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
} satisfies Prisma.ProjectSelect;

export type ProjectCardRow = Prisma.ProjectGetPayload<{ select: typeof projectCardSelect }>;

/** 쿼리스트링 → 검증 전 평면 객체. 빈 문자열은 "지정 안 함"으로 본다. */
export function pickQueryParams(params: Record<string, string | string[] | undefined>) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    const s = Array.isArray(v) ? v[0] : v;
    if (s !== undefined && s !== "") out[k] = s;
  }
  return out;
}
