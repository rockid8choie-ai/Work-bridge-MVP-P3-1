# syntax=docker/dockerfile:1
# Next.js 16 standalone 빌드. 로컬 compose 용 — 배포는 Vercel.

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 빌드 시점엔 DB 가 없어도 된다 (prisma generate 만 필요)
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV DIRECT_URL=postgresql://build:build@localhost:5432/build
RUN npm run build

FROM node:24-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
# standalone 산출물 + 정적 파일
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
# 마이그레이션·시드를 컨테이너 안에서 돌리기 위한 것들
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/prisma ./node_modules/prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/.bin ./node_modules/.bin
COPY --from=build /app/node_modules/tsx ./node_modules/tsx
COPY --from=build /app/node_modules/bcryptjs ./node_modules/bcryptjs
EXPOSE 3000
CMD ["node", "server.js"]
