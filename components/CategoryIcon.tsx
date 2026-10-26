/** 카테고리 아이콘 — 선 2px, 24 그리드. 라이브러리 없이 인라인 SVG 8종 (docs/11 5장). */
const PATHS: Record<string, string> = {
  "누수·방수": "M12 3.5 6.5 10.5a6.5 6.5 0 1 0 11 0L12 3.5Z",
  "전기·조명": "M13 2 4.5 13.5H11l-1 8.5L19.5 10.5H13l1-8.5Z",
  "설비·배관": "M4 7h5a3 3 0 0 1 3 3v4a3 3 0 0 0 3 3h5M4 4v6M20 14v6",
  "외벽·도장": "M4 4h11v5H4zM15 6h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-6v7h-2v-9h8V8h-3",
  "인테리어·목공": "M3 21 14 10m0 0 3-3 4 4-3 3-4-4ZM13 11l-2-2 6-6 2 2",
  "소방·안전": "M12 3s7 5 7 11a7 7 0 0 1-14 0c0-2.5 1.5-4.5 3-6 0 2 1 3 2 3 0-3 2-5.5 2-8Z",
  "공조·환기": "M12 12a3 3 0 1 0 0 .01M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1",
  기타: "M5 12h.01M12 12h.01M19 12h.01",
};

export default function CategoryIcon({ name, className = "size-5" }: { name: string; className?: string }) {
  const d = PATHS[name] ?? PATHS["기타"];
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d={d} />
    </svg>
  );
}
