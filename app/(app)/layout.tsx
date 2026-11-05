import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import AppNav from "@/components/AppNav";
import Logo from "@/components/Logo";

/**
 * 로그인 후 공통 셸 — 글래스 고정 헤더(docs/11 5장). 역할별 메뉴(B-30), 미확인 알림 수(B-25).
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const unread = await prisma.notification.count({ where: { userId: user.id, readAt: null } });

  const menu =
    user.role === "client"
      ? [
          { href: "/projects", label: "공사 찾기" },
          { href: "/me/projects", label: "내 건물 공사" },
          { href: "/me/payments", label: "결제 내역" },
        ]
      : [
          { href: "/projects", label: "공사 찾기" },
          { href: "/me/applications", label: "내 지원" },
          { href: "/me/bookmarks", label: "찜한 공사" },
          { href: "/me/payments", label: "정산 내역" },
        ];

  return (
    <div className="flex min-h-dvh flex-col bg-canvas-50">
      <header className="glass sticky top-0 z-20 border-b border-line-200/70">
        <div className="relative mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-2.5 sm:px-8 sm:py-3">
          <Logo />
          <AppNav
            menu={menu}
            unread={unread}
            user={{ name: user.name, role: user.role === "client" ? "client" : "freelancer", avatarUrl: user.avatarUrl ?? null }}
          />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-8 sm:py-10">{children}</main>
    </div>
  );
}
