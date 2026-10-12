import { PrismaClient } from "@prisma/client";

// 개발 중 HMR 로 커넥션이 쌓이지 않도록 전역에 하나만 둔다.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
