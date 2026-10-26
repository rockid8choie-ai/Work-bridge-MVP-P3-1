import Link from "next/link";
import { dateKo, RECRUIT_LABEL, RECRUIT_STYLE, won } from "@/lib/shared/labels";

/** 목록 · 북마크 · 추천에서 같이 쓰는 카드. 외부 노출이라 모집 단계 상태만 보여준다 (B-17). */
export type ProjectCardData = {
  id: string;
  title: string;
  category: string;
  budget: number | null;
  deadlineAt: Date | string;
  recruitStatus: keyof typeof RECRUIT_LABEL;
  skills: string[];
  applicationCount: number;
  region: string | null;
};

/** 카드 구조는 docs/08 5장 — 상단 카테고리·상태 chip, 제목 18/600 두 줄, 지역·마감·예산, 전문분야 chips, 하단 지원자 수. */
export default function ProjectCard({ p, compact = false }: { p: ProjectCardData; compact?: boolean }) {
  return (
    <Link
      href={`/projects/${p.id}`}
      className="block rounded-card border border-line-200 bg-paper p-4 transition-colors hover:border-ink-400"
    >
      <div className="flex items-center gap-1.5">
        <span className="rounded-full bg-line-100 px-2.5 py-1 text-[11px] font-medium text-ink-700">{p.category}</span>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${RECRUIT_STYLE[p.recruitStatus]}`}>
          {RECRUIT_LABEL[p.recruitStatus]}
        </span>
      </div>

      <h2 className={`mt-2.5 line-clamp-2 text-ink-900 ${compact ? "text-[15px] font-semibold leading-snug" : "text-h3"}`}>
        {p.title}
      </h2>
      <p className="mt-1.5 text-[13px] text-ink-500">
        {p.region && `${p.region} · `}
        마감 {dateKo(p.deadlineAt)}
        {" · "}
        <span className="font-semibold text-ink-900">{won(p.budget)}</span>
      </p>

      {!compact && (
        <>
          {p.skills.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {p.skills.map((name) => (
                <span key={name} className="rounded-full border border-line-200 px-2 py-0.5 text-[11px] text-ink-700">
                  {name}
                </span>
              ))}
            </div>
          )}
          <p className="mt-3 border-t border-line-100 pt-2.5 text-[13px] text-ink-500">지원자 {p.applicationCount}명</p>
        </>
      )}
    </Link>
  );
}
