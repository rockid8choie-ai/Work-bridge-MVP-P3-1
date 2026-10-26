import Link from "next/link";

/**
 * 브랜드 로고 — BFS 워드마크는 승인 원본(public/bfs-wordmark.png)만 쓴다. 글자 재현·변형 금지.
 * 서비스명은 "BFS Working Bridge": 워드마크 이미지 + 텍스트 조합.
 * 다크 배경에서는 invert — 워드마크를 흰색 녹아웃으로(색만 반전, 형태 그대로).
 */
export default function Logo({
  size = "md",
  href = "/",
  invert = false,
}: {
  size?: "sm" | "md" | "lg";
  href?: string | null;
  invert?: boolean;
}) {
  const img = size === "lg" ? "h-8" : size === "sm" ? "h-[18px]" : "h-[22px]";
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-[15px]" : "text-[17px]";
  const inner = (
    <span className="inline-flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/bfs-wordmark.png" alt="BFS" className={`${img} w-auto ${invert ? "brightness-0 invert" : ""}`} />
      <span className={`${text} font-bold leading-none tracking-tight ${invert ? "text-white" : "text-ink-900"}`}>
        Working Bridge
      </span>
    </span>
  );
  if (!href) return inner;
  return (
    <Link href={href} aria-label="BFS Working Bridge 홈" className="inline-flex items-center">
      {inner}
    </Link>
  );
}
