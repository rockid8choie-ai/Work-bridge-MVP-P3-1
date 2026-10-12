import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/auth";

const STATUS_LABEL = {
  scheduled: "모집 예정",
  open: "모집 중",
  closed: "모집 마감",
} as const;

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  const project = await prisma.project.findFirst({
    where: { id, deletedAt: null },
    include: {
      skills: { select: { skill: { select: { name: true } } } },
      client: { select: { id: true, name: true, clientProfile: true } },
      _count: { select: { applications: true } },
    },
  });

  if (!project) notFound();

  const isOwner = user?.id === project.clientId;

  return (
    <article className="max-w-2xl">
      <Link href="/projects" className="text-sm font-semibold text-slate-400">
        ← 프로젝트
      </Link>

      <header className="mt-4">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
            {STATUS_LABEL[project.recruitStatus]}
          </span>
          <span className="text-[13px] text-slate-500">{project.category}</span>
        </div>
        <h1 className="mt-2.5 text-2xl font-extrabold leading-tight tracking-tight text-slate-900">
          {project.title}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {project.client.name}
          {project.client.clientProfile?.buildingName &&
            ` · ${project.client.clientProfile.buildingName}`}
          {project.client.clientProfile?.region && ` · ${project.client.clientProfile.region}`}
        </p>
      </header>

      <dl className="mt-6 grid grid-cols-3 gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
        <div>
          <dt className="text-xs text-slate-400">예산</dt>
          <dd className="mt-0.5 font-bold text-slate-900">
            {project.budget != null ? `${project.budget.toLocaleString("ko-KR")}원` : "미정"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-400">모집 마감</dt>
          <dd className="mt-0.5 font-bold text-slate-900">
            {project.deadlineAt.toLocaleDateString("ko-KR")}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-400">지원</dt>
          <dd className="mt-0.5 font-bold text-slate-900">{project._count.applications}건</dd>
        </div>
      </dl>

      <section className="mt-7">
        <h2 className="text-sm font-bold text-slate-700">공사 내용</h2>
        <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-700">
          {project.description}
        </p>
      </section>

      <section className="mt-7">
        <h2 className="text-sm font-bold text-slate-700">필요 전문분야</h2>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {project.skills.map((s) => (
            <span
              key={s.skill.name}
              className="rounded-lg bg-slate-100 px-2.5 py-1 text-[13px] text-slate-600"
            >
              {s.skill.name}
            </span>
          ))}
        </div>
      </section>

      {isOwner && (
        <section className="mt-8 rounded-2xl border border-dashed border-slate-200 p-5">
          <h2 className="text-sm font-bold text-slate-700">AI 범위 분해</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
            공사 내용을 단위 공정으로 쪼개 항목별 단가를 산정합니다. 그 결과가 그대로 계약
            범위 조항이자 작업 단계이자 정산 단위가 됩니다.
          </p>
          <p className="mt-3 text-xs font-semibold text-slate-400">스프린트 2에서 구현</p>
        </section>
      )}
    </article>
  );
}
