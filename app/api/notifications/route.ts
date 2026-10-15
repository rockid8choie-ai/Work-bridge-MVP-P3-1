import { prisma } from "@/lib/server/db";
import { fail, ok, readJson } from "@/lib/server/api";
import { requireUser } from "@/lib/server/guard";
import { readNotificationSchema } from "@/lib/server/validators.application";

export const runtime = "nodejs";

/** 내 알림 목록 + 미확인 수 (B-25) */
export async function GET() {
  try {
    const user = await requireUser();
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    ]);
    return ok({ notifications, unreadCount });
  } catch (error) {
    return fail(error);
  }
}

/** 읽음 처리 — 하나(클릭) 또는 전부(일괄) (B-25, B-26). 남의 알림은 where 로 걸러진다. */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = readNotificationSchema.parse(await readJson(request));

    const result = await prisma.notification.updateMany({
      where: { userId: user.id, readAt: null, ...(body.id && { id: body.id }) },
      data: { readAt: new Date() },
    });
    const unreadCount = await prisma.notification.count({ where: { userId: user.id, readAt: null } });

    return ok({ updated: result.count, unreadCount });
  } catch (error) {
    return fail(error);
  }
}
