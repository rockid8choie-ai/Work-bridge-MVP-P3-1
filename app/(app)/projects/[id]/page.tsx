import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/auth";
import { syncRecruitStatuses } from "@/lib/server/projects";
import { projectCardSelect } from "@/lib/server/projects.query";
import {
  APPLICATION_LABEL,
  APPLICATION_STYLE,
  DEAL_LABEL,
  DEAL_STYLE,
  dateKo,
  RECRUIT_LABEL,
  RECRUIT_STYLE,
  won,
} from "@/lib/shared/labels";
import ApplyForm from "@/components/ApplyForm";
import BookmarkButton from "@/components/BookmarkButton";
import OwnerActions from "@/components/OwnerActions";
import ProjectCard from "@/components/ProjectCard";

/**
 * 프로젝트 상세 (B-10) — 정보 + 지원자 수 + 상태 + 추천 섹션 (B-28).
 * 거래 단계 상태는 소유자에게만 보여준다 (B-17).
 */
export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  await syncRecruitStatuses();

  const project = await prisma.project.findFirst({
    where: { id, deletedAt: null },
    include: {
      skills: { select: { skill: { select: { id: true, name: true } } } },
      client: { select: { id: true, name: true, bio: true, clientProfile: true } },
      _count: { select: { applications: true } },
    },
  });
  if (!project) notFound();

  const isOwner = user?.id === project.clientId;
  const isFreelancer = user?.role === "freelancer";

  const [myApplication, bookmarked, pendingCount, recommended] = await Promise.all([
    isFreelancer
      ? prisma.application.findUnique({
          where: { projectId_freelancerId: { projectId: id, freelancerId: user!.id } },
          select: { status: true, proposedAmount: true, proposedDays: true, createdAt: true },
        })
      : null,
    isFreelancer
      ? prisma.bookmark.findUnique({ where: { userId_projectId: { userId: user!.id, projectId: id } } })
      : null,
    isOwner ? prisma.application.count({ where: { projectId: id, status: "pending" } }) : 0,
    findRecommended(id, project.category, project.skills.map((s) => s.skill.id)),
  ]);

  return (
    <article className="card max-w-3xl p-6 sm:p-8">
      <Link href="/projects" className="text-sm font-semibold text-ink-400">
        ← 공사 찾기
      </Link>

      <header className="mt-4">
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${RECRUIT_STYLE[project.recruitStatus]}`}>
            {RECRUIT_LABEL[project.recruitStatus]}
          </span>
          {isOwner && project.dealStatus && (
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${DEAL_STYLE[project.dealStatus]}`}>
              {DEAL_LABEL[project.dealStatus]}
            </span>
          )}
          <span className="text-[13px] text-ink-500">{project.category}</span>
        </div>
        <div className="mt-2.5 flex items-start justify-between gap-3">
          <h1 className="text-h2 sm:text-h1 text-ink-900">{project.title}</h1>
          {isFreelancer && <BookmarkButton projectId={id} initial={Boolean(bookmarked)} />}
        </div>
        <p className="mt-2 text-sm text-ink-500">
          <Link href={`/users/${project.client.id}`} className="font-semibold text-ink-700">
            {project.client.name}
          </Link>
          {project.client.clientProfile?.buildingName && ` · ${project.client.clientProfile.buildingName}`}
          {project.client.clientProfile?.region && ` · ${project.client.clientProfile.region}`}
        </p>
      </header>

      <dl className="mt-6 grid grid-cols-3 gap-3 rounded-2xl bg-canvas-50 p-4 text-sm">
        <div>
          <dt className="text-caption text-ink-400">예산</dt>
          <dd className="mt-0.5 font-bold text-ink-900">{won(project.budget)}</dd>
        </div>
        <div>
          <dt className="text-caption text-ink-400">모집 마감</dt>
          <dd className="mt-0.5 font-bold text-ink-900">{dateKo(project.deadlineAt)}</dd>
        </div>
        <div>
          <dt className="text-caption text-ink-400">지원</dt>
          <dd className="mt-0.5 font-bold text-ink-900">{project._count.applications}건</dd>
        </div>
      </dl>

      <section className="mt-7 border-t border-line-100 pt-6">
        <h2 className="text-h3 text-ink-900">공사 내용</h2>
        <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-700">{project.description}</p>
      </section>

      <section className="mt-7 border-t border-line-100 pt-6">
        <h2 className="text-h3 text-ink-900">필요 전문분야</h2>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {project.skills.map((s) => (
            <span key={s.skill.id} className="rounded-full border border-line-200 px-2.5 py-1 text-[13px] text-ink-700">
              {s.skill.name}
            </span>
          ))}
        </div>
      </section>

      {isOwner && (
        <>
          <OwnerActions
            projectId={id}
            recruitStatus={project.recruitStatus}
            dealStatus={project.dealStatus}
            pendingCount={pendingCount}
          />
          <section className="mt-6 rounded-card border border-dashed border-line-200 bg-canvas-50 p-5">
            <h2 className="text-h3 text-ink-900">AI 공정 분해</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
              공사 내용을 단위 공정으로 쪼개 항목별 단가를 산정합니다. 그 결과가 그대로 계약 범위 조항이자 작업
              단계이자 정산 단위가 됩니다.
            </p>
            <p className="mt-3 text-xs font-semibold text-ink-400">스프린트 2에서 구현</p>
          </section>
        </>
      )}

      {isFreelancer && myApplication && (
        <section className="mt-8 card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-h3 text-ink-900">내 지원</h2>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${APPLICATION_STYLE[myApplication.status]}`}>
              {APPLICATION_LABEL[myApplication.status]}
            </span>
          </div>
          <p className="mt-2 text-sm text-ink-700">
            {won(myApplication.proposedAmount)} · {myApplication.proposedDays}일 · {dateKo(myApplication.createdAt)} 지원
          </p>
          <Link href="/me/applications" className="mt-3 inline-block text-[13px] font-semibold text-accent-600">
            내 지원 현황 보기 →
          </Link>
        </section>
      )}

      {isFreelancer && !myApplication && project.recruitStatus === "open" && (
        <ApplyForm projectId={id} budget={project.budget} />
      )}

      {isFreelancer && !myApplication && project.recruitStatus !== "open" && (
        <p className="mt-8 rounded-2xl bg-canvas-50 px-4 py-5 text-center text-sm text-ink-500">
          {project.recruitStatus === "scheduled" ? "아직 모집 전이에요" : "모집이 마감된 공사예요"}
        </p>
      )}

      {recommended.length > 0 && (
        <section className="mt-10 border-t border-line-100 pt-6">
          <h2 className="text-h3 text-ink-900">비슷한 공사</h2>
          <div className="mt-3 space-y-2">
            {recommended.map((p) => (
              <ProjectCard
                key={p.id}
                compact
                p={{
                  id: p.id,
                  title: p.title,
                  category: p.category,
                  budget: p.budget,
                  deadlineAt: p.deadlineAt,
                  recruitStatus: p.recruitStatus,
                  skills: p.skills.map((s) => s.skill.name),
                  applicationCount: p._count.applications,
                  region: p.client.clientProfile?.region ?? null,
                }}
              />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

/**
 * 추천 프로젝트 (B-28) — 같은 카테고리에서 공통 전문분야가 많은 순으로 3건.
 * 정교한 추천은 범위 밖이라 단순 규칙으로 둔다.
 */
async function findRecommended(excludeId: string, category: string, skillIds: string[]) {
  const candidates = await prisma.project.findMany({
    where: {
      id: { not: excludeId },
      deletedAt: null,
      recruitStatus: { not: "closed" },
      OR: [{ category }, { skills: { some: { skillId: { in: skillIds } } } }],
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { ...projectCardSelect, skills: { select: { skillId: true, skill: { select: { name: true } } } } },
  });

  const score = (p: (typeof candidates)[number]) =>
    (p.category === category ? 10 : 0) + p.skills.filter((s) => skillIds.includes(s.skillId)).length;

  return candidates.sort((a, b) => score(b) - score(a)).slice(0, 3);
}
