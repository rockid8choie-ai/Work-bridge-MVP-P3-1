import Link from "next/link";
import { dateKo, RECRUIT_LABEL, RECRUIT_STYLE, won } from "@/lib/shared/labels";
import CategoryIcon from "./CategoryIcon";

/** 목록 · 찜 · 추천 · 홈에서 같이 쓰는 카드. 외부 노출이라 모집 단계 상태만 보여준다 (B-17). */
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

function dDay(d: Date | string) {
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
  if (diff < 0) return "마감";
  if (diff === 0) return "오늘 마감";
  return `D-${diff}`;
}

/** 카드 구조는 docs/11 5장 — 아이콘·카테고리 / 상태 chip → 제목 → 예산(강조) → 지역·마감 → 전문분야 → 지원자 수. */
export default function ProjectCard({ p, compact = false }: { p: ProjectCardData; compact?: boolean }) {
  return (
    <Link href={`/projects/${p.id}`} className={`card card-hover flex flex-col ${compact ? "p-4" : "p-5"}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-500">
          <span className="flex size-7 items-center justify-center rounded-lg bg-accent-50 text-accent-700">
            <CategoryIcon name={p.category} className="size-4" />
          </span>
          {p.category}
        </span>
        <span className={`chip ${RECRUIT_STYLE[p.recruitStatus]}`}>{RECRUIT_LABEL[p.recruitStatus]}</span>
      </div>

      <h2 className={`mt-3 line-clamp-2 text-ink-900 ${compact ? "text-[15px] font-bold leading-snug" : "text-h3"}`}>
        {p.title}
      </h2>

      <p className={`mt-2 font-bold tracking-tight text-ink-900 ${compact ? "text-[15px]" : "text-[20px]"}`}>
        {won(p.budget)}
      </p>
      <p className="mt-1 text-[13px] text-ink-500">
        {p.region && `${p.region} · `}
        {dateKo(p.deadlineAt)} 마감
        <span className="ml-1.5 rounded-md bg-canvas-100 px-1.5 py-0.5 text-[11px] font-semibold text-ink-700">
          {dDay(p.deadlineAt)}
        </span>
      </p>

      {!compact && (
        <>
          {p.skills.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {p.skills.map((name) => (
                <span key={name} className="chip border border-line-200 text-ink-700">
                  {name}
                </span>
              ))}
            </div>
          )}
          <p className="mt-auto border-t border-line-100 pt-3 text-[13px] text-ink-500">
            <span className="font-semibold text-ink-900">{p.applicationCount}명</span> 지원
          </p>
        </>
      )}
    </Link>
  );
}
