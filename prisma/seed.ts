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

  // 두 번째 전문가 — "한 명 수락 → 나머지 자동 거절" 을 시연하려면 지원자가 둘 이상 필요하다 (B-20)
  const plumbing = await prisma.skill.findUniqueOrThrow({ where: { name: "설비·배관" } });
  const vendor2 = await prisma.user.upsert({
    where: { email: "pro2@workbridge.test" },
    update: {},
    create: {
      email: "pro2@workbridge.test",
      name: "이설비",
      role: "freelancer",
      passwordHash,
      vendorProfile: {
        create: {
          mainCategory: "설비·배관",
          years: 9,
          hourlyRate: 55000,
        },
      },
    },
  });
  for (const skill of [plumbing, waterproof]) {
    await prisma.vendorSkill.upsert({
      where: { vendorId_skillId: { vendorId: vendor2.id, skillId: skill.id } },
      update: {},
      create: { vendorId: vendor2.id, skillId: skill.id },
    });
  }

  const DEMO_PROJECTS = [
    {
      title: "3층 화장실 천장 누수 보수",
      description:
        "3층 공용 화장실 천장에서 물이 새고 있습니다. 아래층 사무실 천장까지 얼룩이 번졌습니다. " +
        "배관 쪽 문제로 보이는데 정확한 원인은 확인이 필요합니다. 임차인이 영업 중이라 주말 작업을 선호합니다.",
      category: "누수·방수",
      budget: 3_200_000,
      days: 14,
    },
    {
      title: "옥상 우레탄 방수 전면 재시공",
      description:
        "옥상 우레탄 방수층이 전체적으로 들떠 있고 균열이 보입니다. 장마철마다 최상층 사무실로 " +
        "물이 새서 임차인 항의가 반복됩니다. 부분 보수로는 안 될 것 같아 전면 재시공을 생각하고 있습니다. " +
        "면적은 약 180㎡이고 옥상 출입구와 배수구 주변이 특히 심합니다.",
      category: "누수·방수",
      budget: 5_000_000,
      days: 30,
    },
  ];

  for (const p of DEMO_PROJECTS) {
    const exists = await prisma.project.findFirst({
      where: { clientId: client.id, title: p.title },
    });
    if (exists) continue;
    await prisma.project.create({
      data: {
        clientId: client.id,
        title: p.title,
        description: p.description,
        category: p.category,
        recruitStatus: "open",
        deadlineAt: new Date(Date.now() + p.days * 24 * 60 * 60 * 1000),
        budget: p.budget,
        skills: { create: [{ skillId: waterproof.id }] },
      },
    });
    console.log(`데모 프로젝트 생성: ${p.title}`);
  }

  console.log("데모 계정: owner@workbridge.test / pro@workbridge.test / pro2@workbridge.test (비밀번호 demo1234)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
