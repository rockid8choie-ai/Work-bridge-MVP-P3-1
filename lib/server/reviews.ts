import "server-only";

import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/server/db";
import { ApiError } from "@/lib/server/api";
import { draftReviewReceived, notifyMany } from "@/lib/server/notify";

/** 상호 평가 (A-12, A-13). 완료된 공사에서만, 방향별 1회, 수정 불가. 태그는 고정 세트 (D-08). */

export const REVIEW_TAGS = {
  client_to_freelancer: ["책임감", "소통", "기술력", "시간 약속", "뒷정리"],
  freelancer_to_client: ["명확한 요구사항", "신속한 피드백", "정확한 결제", "현장 협조", "합리적 기대"],
} as const;

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, "별점을 골라 주세요").max(5),
  comment: z.string().trim().max(1000).optional(),
  tags: z.array(z.string().trim().min(1)).max(5).default([]),
});

export async function writeReview(projectId: string, authorId: string, input: z.infer<typeof reviewSchema>) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.findFirst({
      where: { id: projectId, deletedAt: null },
      include: { applications: { where: { status: "accepted" }, select: { freelancerId: true }, take: 1 } },
    });
    if (!project) throw new ApiError(404, "NOT_FOUND", "프로젝트를 찾을 수 없어요");
    if (project.dealStatus !== "completed") throw new ApiError(409, "NOT_COMPLETED", "공사가 완료된 뒤에 평가할 수 있어요");

    const freelancerId = project.applications[0]?.freelancerId;
    const isClient = project.clientId === authorId;
    const isFreelancer = freelancerId === authorId;
    if (!isClient && !isFreelancer) throw new ApiError(403, "FORBIDDEN", "이 공사의 당사자만 평가할 수 있어요");

    const direction = isClient ? "client_to_freelancer" : "freelancer_to_client";
    const targetId = isClient ? freelancerId! : project.clientId;

    const allowed = REVIEW_TAGS[direction] as readonly string[];
    const bad = input.tags.find((t) => !allowed.includes(t));
    if (bad) throw new ApiError(400, "BAD_TAG", `"${bad}" 는 고를 수 없는 태그예요`);

    try {
      const review = await tx.review.create({
        data: { projectId, authorId, targetId, direction, rating: input.rating, comment: input.comment || null, tags: input.tags },
      });
      await notifyMany(tx, [draftReviewReceived({ userId: targetId, projectId, projectTitle: project.title, rating: input.rating })]);
      return review;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new ApiError(409, "ALREADY_REVIEWED", "이미 평가했어요. 리뷰는 한 번만 쓸 수 있고 수정할 수 없어요");
      }
      throw e;
    }
  });
}

/** 프로필용 — 평균 별점 + 최근 리뷰 (A-13) */
export async function reviewSummary(targetId: string) {
  const [agg, reviews] = await Promise.all([
    prisma.review.aggregate({ where: { targetId }, _avg: { rating: true }, _count: { _all: true } }),
    prisma.review.findMany({
      where: { targetId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        rating: true,
        comment: true,
        tags: true,
        createdAt: true,
        author: { select: { id: true, name: true } },
        project: { select: { id: true, title: true } },
      },
    }),
  ]);
  return { average: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null, count: agg._count._all, reviews };
}
