import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/auth";
import { DEAL_LABEL, RECRUIT_LABEL } from "@/lib/shared/labels";
import ApplicantList from "@/components/ApplicantList";

/** 지원자 관리 (B-19) — 프로젝트 소유 건물주만 */
export default async function ApplicantsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const project = await prisma.project.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, title: true, clientId: true, recruitStatus: true, dealStatus: true },
  });
  if (!project) notFound();
  if (project.clientId !== user.id) redirect(`/projects/${id}`);

  return (
    <div className="max-w-2xl">
      <Link href={`/projects/${id}`} className="text-sm font-semibold text-slate-400">
        ← {project.title}
      </Link>
      <div className="mt-3 flex items-end justify-between">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900">지원자 관리</h1>
        <span className="text-[13px] text-slate-500">
          {RECRUIT_LABEL[project.recruitStatus]}
          {project.dealStatus && ` · ${DEAL_LABEL[project.dealStatus]}`}
        </span>
      </div>
      <p className="mt-1.5 text-sm text-slate-500">
        한 명을 수락하면 나머지 검토중 지원은 자동 거절되고 모집이 마감됩니다.
      </p>
      <div className="mt-6">
        <ApplicantList projectId={id} />
      </div>
    </div>
  );
}
