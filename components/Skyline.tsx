/** 히어로 하단 건물 실루엣 — 결정적 배열로 그린 SVG. 도메인(건물) 암시용, 장식이라 aria-hidden. */
const BUILDINGS = [
  [0, 70], [60, 120], [110, 90], [150, 170], [210, 110], [250, 140], [300, 200], [360, 120], [400, 160],
  [450, 90], [490, 230], [550, 130], [600, 180], [660, 100], [700, 150], [750, 210], [810, 120], [850, 170],
  [900, 95], [940, 140], [990, 190], [1050, 110], [1100, 160], [1150, 240], [1210, 130], [1260, 100],
  [1300, 180], [1360, 120], [1400, 150],
];

export default function Skyline({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1440 240"
      preserveAspectRatio="none"
      className={`pointer-events-none block w-full ${className}`}
      aria-hidden
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2f6bff" stopOpacity="0.22" />
          <stop offset="1" stopColor="#0b1426" stopOpacity="0" />
        </linearGradient>
        <pattern id="win" width="12" height="14" patternUnits="userSpaceOnUse">
          <rect x="3" y="3" width="5" height="6" fill="#9fc0ff" opacity="0.18" />
        </pattern>
      </defs>
      {BUILDINGS.map(([x, h], i) => {
        const w = (BUILDINGS[i + 1]?.[0] ?? 1440) - x - 6;
        return (
          <g key={x}>
            <rect x={x} y={240 - h} width={w} height={h} fill="url(#sky)" />
            <rect x={x} y={240 - h} width={w} height={h} fill="url(#win)" />
          </g>
        );
      })}
    </svg>
  );
}
