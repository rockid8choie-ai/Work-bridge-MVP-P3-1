import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/auth";

export const runtime = "nodejs";

/**
 * 알림 클릭 = 읽음 처리 + 해당 페이지로 이동 (B-25).
 * 일반 링크로 동작하게 GET + 리다이렉트로 만들었다. 자바스크립트 없이도 된다.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const origin = new URL(request.url).origin;

  if (!user) return NextResponse.redirect(new URL("/login", origin));

  const n = await prisma.notification.findFirst({ where: { id, userId: user.id } });
  if (!n) return NextResponse.redirect(new URL("/notifications", origin));

  if (!n.readAt) {
    await prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  }

  return NextResponse.redirect(new URL(n.link, origin));
}
