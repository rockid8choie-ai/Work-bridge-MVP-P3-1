import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker 이미지용 standalone 산출물. Vercel 배포에는 영향 없음.
  output: "standalone",
  // cacheComponents 는 끈다(따라서 partialPrefetching 도 함께 뺀다).
  // 라우트 핸들러의 runtime 설정과 충돌하는데, bcrypt·Prisma 때문에 Node 런타임이
  // 필요하고 2주 MVP 범위에서 캐시 최적화는 과하다.
  // 로컬 빌드만 워커를 제한한다. 기본값(코어 수만큼)으로 돌리면 개발 머신에서
  // 워커가 11개까지 떠서 JS heap out of memory 로 죽는다. CI 에서는 제한할 이유가 없다.
  ...(process.env.VERCEL ? {} : { experimental: { cpus: 2 } }),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
