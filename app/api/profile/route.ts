import { prisma } from "@/lib/server/db";
import { fail, ok, readJson } from "@/lib/server/api";
import { requireUser } from "@/lib/server/guard";
import { clientProfileSchema, vendorProfileSchema } from "@/lib/server/validators";

export const runtime = "nodejs";

// 현재 역할에 맞는 프로필 조회
export async function GET() {
  try {
    const user = await requireUser();

    if (user.role === "client") {
      const profile = await prisma.clientProfile.findUnique({ where: { userId: user.id } });
      return ok({ role: user.role, profile });
    }

    const profile = await prisma.vendorProfile.findUnique({
      where: { userId: user.id },
      include: { skills: { select: { skillId: true } } },
    });
    return ok({
      role: user.role,
      profile: profile && { ...profile, skills: profile.skills.map((s) => s.skillId) },
    });
  } catch (error) {
    return fail(error);
  }
}

// 역할별 프로필 저장 (최초 작성·수정 공용)
export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    const raw = await readJson(request);

    if (user.role === "client") {
      const data = clientProfileSchema.parse(raw);
      const profile = await prisma.clientProfile.upsert({
        where: { userId: user.id },
        update: data,
        create: { ...data, userId: user.id },
      });
      return ok({ profile });
    }

    const { skills, ...rest } = vendorProfileSchema.parse(raw);

    // 전문분야는 통째로 교체한다 — 부분 갱신은 화면에 없는 동작이다
    const profile = await prisma.$transaction(async (tx) => {
      const saved = await tx.vendorProfile.upsert({
        where: { userId: user.id },
        update: rest,
        create: { ...rest, userId: user.id },
      });
      await tx.vendorSkill.deleteMany({ where: { vendorId: user.id } });
      await tx.vendorSkill.createMany({
        data: skills.map((skillId) => ({ vendorId: user.id, skillId })),
        skipDuplicates: true,
      });
      return saved;
    });

    return ok({ profile });
  } catch (error) {
    return fail(error);
  }
}
