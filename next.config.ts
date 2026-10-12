import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents 는 끈다(따라서 partialPrefetching 도 함께 뺀다).
  // 라우트 핸들러의 runtime 설정과 충돌하는데, bcrypt·Prisma 때문에 Node 런타임이
  // 필요하고 2주 MVP 범위에서 캐시 최적화는 과하다.
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
