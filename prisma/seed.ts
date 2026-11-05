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

  // 세 번째 전문가 — 지원자 목록이 "비교할 만큼" 보이려면 셋은 있어야 한다
  const interior = await prisma.skill.findUniqueOrThrow({ where: { name: "인테리어·목공" } });
  const vendor3 = await prisma.user.upsert({
    where: { email: "pro3@workbridge.test" },
    update: {},
    create: {
      email: "pro3@workbridge.test",
      name: "최방수",
      role: "freelancer",
      passwordHash,
      bio: "옥상·지하 방수 전문. 열화상 진단 장비 보유, 소규모 상가 건물 위주로 작업합니다.",
      vendorProfile: {
        create: {
          mainCategory: "방수·도장",
          years: 6,
          hourlyRate: 48000,
        },
      },
    },
  });
  for (const skill of [waterproof, interior]) {
    await prisma.vendorSkill.upsert({
      where: { vendorId_skillId: { vendorId: vendor3.id, skillId: skill.id } },
      update: {},
      create: { vendorId: vendor3.id, skillId: skill.id },
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
      applications: [
        { vendor, coverLetter: "누수 원인 진단(청음·열화상) 후 배관 교체와 방수 재시공 순으로 진행하겠습니다. 주말 작업 가능하고, 아래층 천장 얼룩 보수까지 포함한 금액입니다.", proposedAmount: 2_900_000, proposedDays: 7 },
        { vendor: vendor2, coverLetter: "배관 쪽 원인일 가능성이 높아 보입니다. 배관 압력 테스트로 누수 지점을 먼저 잡고, 필요한 구간만 교체해 비용을 줄이겠습니다. 타일 복구는 별도 협의.", proposedAmount: 2_400_000, proposedDays: 5 },
        { vendor: vendor3, coverLetter: "열화상 장비로 진단 후 최소 범위로 보수합니다. 상가 건물 영업 중 작업 경험이 많아 소음·분진 관리에 자신 있습니다.", proposedAmount: 2_650_000, proposedDays: 6 },
      ],
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
      applications: [
        { vendor, coverLetter: "기존 도막 전면 제거 후 프라이머·우레탄 중도 2회·탑코트로 재시공합니다. 배수구 주변은 보강 메쉬를 넣고, 시공 후 담수 테스트까지 해 드립니다. 180㎡ 기준 5일.", proposedAmount: 4_800_000, proposedDays: 5 },
        { vendor: vendor3, coverLetter: "들뜬 구간 절개 후 전면 재도장 방식으로 제안합니다. 기존 도막을 전부 걷지 않아 공기와 비용을 줄일 수 있고, 5년 하자보증 드립니다.", proposedAmount: 4_200_000, proposedDays: 4 },
      ],
    },
  ];

  for (const p of DEMO_PROJECTS) {
    let project = await prisma.project.findFirst({ where: { clientId: client.id, title: p.title }, include: { contract: { select: { id: true } } } });
    if (!project) {
      project = await prisma.project.create({
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
        include: { contract: { select: { id: true } } },
      });
      console.log(`데모 프로젝트 생성: ${p.title}`);
    } else if (!project.contract && project.dealStatus === null) {
      // 시연 직전 다시 돌리면 마감일을 늘리고 모집 중으로 되돌린다 (거래가 시작된 공사는 건드리지 않는다)
      await prisma.project.update({
        where: { id: project.id },
        data: { recruitStatus: "open", deletedAt: null, deadlineAt: new Date(Date.now() + p.days * 24 * 60 * 60 * 1000) },
      });
      console.log(`데모 프로젝트 모집 재개: ${p.title}`);
    }

    // 지원서 — 심사자가 "수락" 을 눌러 볼 수 있어야 한다. 이미 있으면 건너뛴다.
    if (!project.contract && project.dealStatus === null) {
      for (const a of p.applications) {
        const exists = await prisma.application.findUnique({ where: { projectId_freelancerId: { projectId: project.id, freelancerId: a.vendor.id } } });
        if (exists) continue;
        await prisma.application.create({
          data: { projectId: project.id, freelancerId: a.vendor.id, coverLetter: a.coverLetter, proposedAmount: a.proposedAmount, proposedDays: a.proposedDays, status: "pending" },
        });
        console.log(`  지원서 생성: ${a.vendor.name} → ${p.title}`);
      }
    }
  }

  console.log("데모 계정: owner@workbridge.test / pro@workbridge.test / pro2@workbridge.test / pro3@workbridge.test (비밀번호 demo1234)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
