import Link from "next/link";
import { prisma } from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/auth";
import { PAGE_SIZE } from "@/lib/server/validators.project";

const STATUS_LABEL = {
  scheduled: "모집 예정",
  open: "모집 중",
  closed: "모집 마감",
} as const;

const STATUS_STYLE = {
  scheduled: "bg-amber-50 text-amber-700",
  open: "bg-blue-50 text-blue-700",
  closed: "bg-slate-100 text-slate-500",
} as const;

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await getCurrentUser();
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [total, projects] = await Promise.all([
    prisma.project.count({ where: { deletedAt: null } }),
    prisma.project.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        category: true,
        budget: true,
        deadlineAt: true,
        recruitStatus: true,
        skills: { select: { skill: { select: { name: true } } } },
        _count: { select: { applications: true } },
        client: { select: { name: true, clientProfile: { select: { region: true } } } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">프로젝트</h1>
          <p className="mt-1 text-sm text-slate-500">전체 {total}건</p>
        </div>
        {user?.role === "client" && (
          <Link
            href="/projects/new"
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white"
          >
            공사 등록
          </Link>
        )}
      </div>

      <div className="mt-6 space-y-3">
        {projects.length === 0 && (
          <p className="rounded-2xl bg-slate-50 px-4 py-12 text-center text-sm text-slate-400">
            아직 등록된 공사가 없어요
          </p>
        )}

        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
            className="block rounded-2xl border border-slate-100 p-4 transition-colors hover:border-slate-300"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-bold leading-snug text-slate-900">{p.title}</h2>
                <p className="mt-1 text-[13px] text-slate-500">
                  {p.category}
                  {p.client.clientProfile?.region && ` · ${p.client.clientProfile.region}`}
                  {" · 마감 "}
                  {p.deadlineAt.toLocaleDateString("ko-KR")}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_STYLE[p.recruitStatus]}`}
              >
                {STATUS_LABEL[p.recruitStatus]}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px]">
              {p.budget != null && (
                <span className="font-bold text-slate-900">
                  {p.budget.toLocaleString("ko-KR")}원
                </span>
              )}
              <span className="text-slate-400">지원 {p._count.applications}건</span>
              <span className="flex flex-wrap gap-1">
                {p.skills.map((s) => (
                  <span
                    key={s.skill.name}
                    className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600"
                  >
                    {s.skill.name}
                  </span>
                ))}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {totalPages > 1 && (
        <nav className="mt-7 flex justify-center gap-1.5">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={`/projects?page=${n}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                n === page ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {n}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
