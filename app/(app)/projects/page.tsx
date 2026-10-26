import Link from "next/link";
import { prisma } from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/auth";
import { syncRecruitStatuses } from "@/lib/server/projects";
import {
  buildProjectOrderBy,
  buildProjectWhere,
  pickQueryParams,
  projectCardSelect,
} from "@/lib/server/projects.query";
import { PAGE_SIZE, projectQuerySchema } from "@/lib/server/validators.project";
import { PROJECT_CATEGORIES } from "@/lib/shared/labels";
import ProjectCard from "@/components/ProjectCard";

const SORTS = [
  { value: "latest", label: "최신순" },
  { value: "deadline", label: "마감임박순" },
  { value: "budget", label: "예산 높은순" },
] as const;

const STATUSES = [
  { value: "", label: "전체 상태" },
  { value: "scheduled", label: "모집 예정" },
  { value: "open", label: "모집 중" },
  { value: "closed", label: "모집 마감" },
] as const;

/**
 * 프로젝트 탐색 — 검색 · 필터 · 정렬 · 페이지네이션 (B-11 ~ B-14).
 * 검색 조건은 전부 쿼리스트링에 두어 새로고침·공유·뒤로가기에 안전하다.
 * API 와 같은 where 빌더를 써서 화면과 API 가 같은 결과를 낸다.
 */
export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  const raw = pickQueryParams(await searchParams);
  const parsed = projectQuerySchema.safeParse(raw);
  const query = parsed.success ? parsed.data : projectQuerySchema.parse({});

  await syncRecruitStatuses();

  const [skills, total, rows] = await Promise.all([
    prisma.skill.findMany({ where: { isCustom: false }, orderBy: { name: "asc" }, select: { name: true } }),
    prisma.project.count({ where: buildProjectWhere(query) }),
    prisma.project.findMany({
      where: buildProjectWhere(query),
      orderBy: buildProjectOrderBy(query.sort),
      skip: (query.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: projectCardSelect,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (n: number) => {
    const sp = new URLSearchParams(raw);
    sp.set("page", String(n));
    return `/projects?${sp.toString()}`;
  };
  const hasFilter = Boolean(query.q || query.category || query.skill || query.status || query.budgetMax);

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-h2 text-ink-900">공사 찾기</h1>
          <p className="mt-1 text-sm text-ink-500">
            {hasFilter ? `조건에 맞는 공사 ${total}건` : `전체 ${total}건`}
          </p>
        </div>
        {user?.role === "client" && (
          <Link href="/projects/new" className="btn-primary px-4 py-2.5 text-sm">
            공사 올리기
          </Link>
        )}
      </div>

      <form method="get" action="/projects" className="card mt-6 p-4">
        <div className="flex gap-2">
          <input
            name="q"
            defaultValue={query.q ?? ""}
            placeholder="제목이나 공사 내용으로 검색"
            className="input min-w-0 flex-1"
          />
          <button type="submit" className="btn-primary px-5 py-2.5 text-sm">
            검색
          </button>
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <select name="category" defaultValue={query.category ?? ""} className="input px-3 py-2 text-[13px]">
            <option value="">전체 카테고리</option>
            {PROJECT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select name="skill" defaultValue={query.skill ?? ""} className="input px-3 py-2 text-[13px]">
            <option value="">전체 전문분야</option>
            {skills.map((s) => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>
          <select name="status" defaultValue={query.status ?? ""} className="input px-3 py-2 text-[13px]">
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select name="budgetMax" defaultValue={query.budgetMax ? String(query.budgetMax) : ""} className="input px-3 py-2 text-[13px]">
            <option value="">예산 전체</option>
            <option value="1000000">100만원 이하</option>
            <option value="3000000">300만원 이하</option>
            <option value="5000000">500만원 이하</option>
            <option value="10000000">1,000만원 이하</option>
          </select>
          <select name="sort" defaultValue={query.sort} className="input px-3 py-2 text-[13px]">
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        {hasFilter && (
          <Link href="/projects" className="mt-2.5 inline-block text-[13px] font-semibold text-ink-500">
            조건 지우기
          </Link>
        )}
      </form>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {rows.length === 0 && (
          <p className="card px-4 py-14 text-center text-sm text-ink-400 sm:col-span-2">
            {hasFilter ? "조건에 맞는 공사가 없어요" : "아직 등록된 공사가 없어요"}
          </p>
        )}
        {rows.map((p) => (
          <ProjectCard
            key={p.id}
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

      {totalPages > 1 && (
        <nav className="mt-7 flex justify-center gap-1.5">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={pageHref(n)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${
                n === query.page ? "bg-ink-900 text-white" : "text-ink-500 hover:bg-canvas-100"
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
