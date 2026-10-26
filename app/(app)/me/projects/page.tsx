import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/auth";
import { syncRecruitStatuses } from "@/lib/server/projects";
import {
  DEAL_LABEL,
  DEAL_STYLE,
  dateKo,
  RECRUIT_LABEL,
  RECRUIT_STYLE,
  won,
} from "@/lib/shared/labels";

/** 내 프로젝트 (B-33) — 건물주. 거래 단계 상태는 이 화면에서만 노출한다 (B-17). */
export default async function MyProjectsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "client") redirect("/me/applications");

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
      _count: { select: { applications: { where: { status: "pending" } } } },
      applications: {
        where: { status: "accepted" },
        select: { freelancer: { select: { name: true } } },
        take: 1,
      },
    },
  });

  return (
    <div className="max-w-2xl">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-h2 text-ink-900">내 건물 공사</h1>
          <p className="mt-1 text-sm text-ink-500">전체 {projects.length}건</p>
        </div>
        <Link href="/projects/new" className="btn-primary px-4 py-2.5 text-sm">
          공사 올리기
        </Link>
      </div>

      <ul className="mt-6 space-y-3">
        {projects.length === 0 && (
          <li className="card px-4 py-14 text-center text-sm text-ink-400">
            아직 등록한 공사가 없어요
          </li>
        )}

        {projects.map((p) => {
          const accepted = p.applications[0]?.freelancer.name;
          return (
            <li key={p.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/projects/${p.id}`} className="font-bold leading-snug text-ink-900">
                    {p.title}
                  </Link>
                  <p className="mt-1 text-[13px] text-ink-500">
                    {p.category} · 마감 {dateKo(p.deadlineAt)} · {won(p.budget)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${RECRUIT_STYLE[p.recruitStatus]}`}>
                    {RECRUIT_LABEL[p.recruitStatus]}
                  </span>
                  {p.dealStatus && (
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${DEAL_STYLE[p.dealStatus]}`}>
                      {DEAL_LABEL[p.dealStatus]}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px]">
                {accepted ? (
                  <span className="text-ok-700">
                    선정 전문가 <b>{accepted}</b>
                  </span>
                ) : (
                  <span className="text-ink-500">검토중 지원 {p._count.applications}건</span>
                )}
                <Link href={`/projects/${p.id}/applicants`} className="font-semibold text-accent-600">
                  지원자 관리 →
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
