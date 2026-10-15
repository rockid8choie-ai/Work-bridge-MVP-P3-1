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

export default function ProjectCard({ p, compact = false }: { p: ProjectCardData; compact?: boolean }) {
  return (
    <Link
      href={`/projects/${p.id}`}
      className="block rounded-2xl border border-slate-100 p-4 transition-colors hover:border-slate-300"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className={`font-bold leading-snug text-slate-900 ${compact ? "text-[15px]" : ""}`}>{p.title}</h2>
          <p className="mt-1 text-[13px] text-slate-500">
            {p.category}
            {p.region && ` · ${p.region}`}
            {" · 마감 "}
            {dateKo(p.deadlineAt)}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${RECRUIT_STYLE[p.recruitStatus]}`}>
          {RECRUIT_LABEL[p.recruitStatus]}
        </span>
      </div>

      {!compact && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px]">
          <span className="font-bold text-slate-900">{won(p.budget)}</span>
          <span className="text-slate-400">지원 {p.applicationCount}건</span>
          <span className="flex flex-wrap gap-1">
            {p.skills.map((name) => (
              <span key={name} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                {name}
              </span>
            ))}
          </span>
        </div>
      )}
    </Link>
  );
}
