import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/auth";
import {
  APPLICATION_LABEL,
  APPLICATION_STYLE,
  DEAL_LABEL,
  dateKo,
  RECRUIT_LABEL,
  won,
} from "@/lib/shared/labels";

/**
 * 내 지원 현황 (B-22) — 전문가. 수락·거절 뒤에도 남는다.
 * 수락된 건은 거래 단계가 함께 보인다 (내부 화면이라 B-17 예외).
 */
export default async function MyApplicationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "freelancer") redirect("/me/projects");

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

  const counts = {
    pending: applications.filter((a) => a.status === "pending").length,
    accepted: applications.filter((a) => a.status === "accepted").length,
    rejected: applications.filter((a) => a.status === "rejected").length,
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-h2 text-ink-900">내 지원 현황</h1>
      <p className="mt-1 text-sm text-ink-500">
        검토중 {counts.pending} · 수락 {counts.accepted} · 거절 {counts.rejected}
      </p>

      <ul className="mt-6 space-y-3">
        {applications.length === 0 && (
          <li className="card px-4 py-14 text-center text-sm text-ink-400">
            아직 지원한 공사가 없어요.{" "}
            <Link href="/projects" className="font-semibold text-accent-600">
              공사 찾아보기
            </Link>
          </li>
        )}

        {applications.map((a) => {
          const gone = Boolean(a.project.deletedAt);
          return (
            <li key={a.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {gone ? (
                    <p className="font-bold text-ink-400 line-through">{a.project.title}</p>
                  ) : (
                    <Link href={`/projects/${a.project.id}`} className="font-bold leading-snug text-ink-900">
                      {a.project.title}
                    </Link>
                  )}
                  <p className="mt-1 text-[13px] text-ink-500">
                    {a.project.category} · {a.project.client.name} · {RECRUIT_LABEL[a.project.recruitStatus]}
                    {a.status === "accepted" && a.project.dealStatus && ` · ${DEAL_LABEL[a.project.dealStatus]}`}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${APPLICATION_STYLE[a.status]}`}>
                  {APPLICATION_LABEL[a.status]}
                </span>
              </div>
              <p className="mt-3 text-[13px] text-ink-700">
                내 제안 <b className="text-ink-900">{won(a.proposedAmount)}</b> · {a.proposedDays}일 · {dateKo(a.createdAt)} 지원
                {a.project.budget != null && <span className="text-ink-400"> · 건물주 예산 {won(a.project.budget)}</span>}
              </p>
              {a.status === "accepted" && a.project.dealStatus === "awaiting_contract" && (
                <p className="mt-3 rounded-control bg-ok-50 px-3 py-2.5 text-[13px] text-ok-700">
                  수락됐어요. 다음 단계(공정표 확정 · 금액 합의 · 계약)는 스프린트 2에서 열립니다.
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
