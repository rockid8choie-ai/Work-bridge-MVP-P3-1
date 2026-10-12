/**
 * 개발 중 만든 테스트 계정 정리용. 운영 데모 계정(@workbridge.test)은 건드리지 않는다.
 * 실행: npx tsx scripts/cleanup-test-data.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const JUNK_EMAILS = [
  "test@wb.local",
  "browser@wb.local",
  "pf@wb.local",
  "prod-check@wb.local",
];

async function main() {
  // Project.clientId 는 RESTRICT 라 사용자를 먼저 지울 수 없다.
  // 건물주를 지우면 그 건물의 공사 기록이 통째로 사라지는 것을 막는 제약이므로,
  // 테스트 데이터를 치울 때만 프로젝트를 먼저 비운다.
  const owners = await prisma.user.findMany({
    where: { email: { in: JUNK_EMAILS } },
    select: { id: true },
  });
  const ownerIds = owners.map((o) => o.id);

  const removedProjects = await prisma.project.deleteMany({ where: { clientId: { in: ownerIds } } });
  console.log(`테스트 프로젝트 ${removedProjects.count}건 삭제`);

  const removed = await prisma.user.deleteMany({ where: { id: { in: ownerIds } } });
  console.log(`테스트 계정 ${removed.count}개 삭제`);

  const users = await prisma.user.findMany({ select: { email: true, role: true } });
  console.log("남은 계정:", users.map((u) => `${u.email}(${u.role})`).join(", "));

  const projects = await prisma.project.findMany({
    where: { deletedAt: null },
    select: { title: true },
  });
  console.log("남은 프로젝트:", projects.map((p) => p.title).join(" / "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
