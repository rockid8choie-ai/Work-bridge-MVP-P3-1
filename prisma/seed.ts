/**
 * 시연용 시드 데이터 (AC A-14).
 *
 * 전문분야 6종은 서비스 운영에 반드시 필요한 기준 데이터라 항상 넣는다.
 * 데모 계정·프로젝트는 ALLOW_DEMO=1 일 때만 — 운영 DB를 가짜 데이터로 오염시키지 않기 위함이다.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/** D-07: 너무 세분화하지 않고 유사 공종은 묶는다 */
const SKILLS = [
  "전기",
  "설비·배관",
  "방수·도장",
  "인테리어·목공",
  "소방·안전",
  "공조·환기",
];

async function main() {
  for (const name of SKILLS) {
    await prisma.skill.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log(`전문분야 ${SKILLS.length}종 준비 완료`);

  if (process.env.ALLOW_DEMO !== "1") {
    console.log("데모 데이터는 건너뜁니다. 넣으려면 ALLOW_DEMO=1 로 실행하세요.");
    return;
  }

  const passwordHash = await bcrypt.hash("demo1234", 12);

  const client = await prisma.user.upsert({
    where: { email: "owner@workbridge.test" },
    update: {},
    create: {
      email: "owner@workbridge.test",
      name: "김건물",
      role: "client",
      passwordHash,
      clientProfile: {
        create: {
          buildingName: "역삼 신원빌딩",
          buildingType: "상가",
          region: "서울 강남구",
        },
      },
    },
  });

  const vendor = await prisma.user.upsert({
    where: { email: "pro@workbridge.test" },
    update: {},
    create: {
      email: "pro@workbridge.test",
      name: "박기술",
      role: "freelancer",
      passwordHash,
      vendorProfile: {
        create: {
          mainCategory: "방수·도장",
          years: 14,
          hourlyRate: 60000,
        },
      },
    },
  });

  const waterproof = await prisma.skill.findUniqueOrThrow({ where: { name: "방수·도장" } });
  await prisma.vendorSkill.upsert({
    where: { vendorId_skillId: { vendorId: vendor.id, skillId: waterproof.id } },
    update: {},
    create: { vendorId: vendor.id, skillId: waterproof.id },
  });

  const existing = await prisma.project.findFirst({ where: { clientId: client.id } });
  if (!existing) {
    const project = await prisma.project.create({
      data: {
        clientId: client.id,
        title: "3층 화장실 천장 누수 보수",
        description:
          "3층 공용 화장실 천장에서 물이 새고 있습니다. 아래층 사무실 천장까지 얼룩이 번졌습니다. " +
          "배관 쪽 문제로 보이는데 정확한 원인은 확인이 필요합니다. 임차인이 영업 중이라 주말 작업을 선호합니다.",
        category: "누수·방수",
        recruitStatus: "open",
        deadlineAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        budget: 3_200_000,
        skills: { create: [{ skillId: waterproof.id }] },
      },
    });
    console.log(`데모 프로젝트 생성: ${project.title}`);
  }

  console.log("데모 계정: owner@workbridge.test / pro@workbridge.test (비밀번호 demo1234)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
