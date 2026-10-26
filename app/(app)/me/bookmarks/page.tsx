import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/auth";
import { projectCardSelect } from "@/lib/server/projects.query";
import ProjectCard from "@/components/ProjectCard";

/** 내 북마크 (B-27) — 여기서 상세로 들어가 바로 지원할 수 있다 */
export default async function MyBookmarksPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "freelancer") redirect("/me/projects");

  const rows = await prisma.bookmark.findMany({
    where: { userId: user.id, project: { deletedAt: null } },
    orderBy: { createdAt: "desc" },
    select: { project: { select: projectCardSelect } },
  });

  return (
    <div className="max-w-2xl">
      <h1 className="text-h2 text-ink-900">찜한 공사</h1>
      <p className="mt-1 text-sm text-ink-500">{rows.length}건</p>

      <div className="mt-6 space-y-3">
        {rows.length === 0 && (
          <p className="card px-4 py-14 text-center text-sm text-ink-400">
            찜한 공사가 없어요.{" "}
            <Link href="/projects" className="font-semibold text-accent-600">
              공사 찾아보기
            </Link>
          </p>
        )}
        {rows.map(({ project: p }) => (
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
    </div>
  );
}
