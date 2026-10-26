import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import LogoutButton from "@/components/LogoutButton";
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
        ]
      : [
          { href: "/projects", label: "공사 찾기" },
          { href: "/me/applications", label: "내 지원" },
          { href: "/me/bookmarks", label: "찜한 공사" },
        ];

  return (
    <div className="flex min-h-dvh flex-col bg-canvas-50">
      <header className="glass sticky top-0 z-20 border-b border-line-200/70">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <Logo />
          <nav className="flex items-center gap-1 text-[13.5px] font-medium sm:gap-2">
            {menu.map((m) => (
              <Link
                key={m.href}
                href={m.href}
                className="rounded-full px-3 py-1.5 text-ink-700 transition-colors hover:bg-canvas-100 hover:text-ink-900"
              >
                {m.label}
              </Link>
            ))}
            <Link
              href="/notifications"
              className="relative rounded-full px-3 py-1.5 text-ink-700 transition-colors hover:bg-canvas-100 hover:text-ink-900"
            >
              알림
              {unread > 0 && (
                <span className="absolute -top-0.5 right-0 min-w-4 rounded-full bg-danger-500 px-1 text-center text-[10px] font-bold leading-4 text-white">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
            <Link
              href="/profile"
              className="ml-1 inline-flex items-center gap-2 rounded-full border border-line-200 bg-paper py-1 pl-1 pr-3 transition-colors hover:border-ink-400"
            >
              <span className="flex size-6 items-center justify-center rounded-full bg-ink-900 text-[11px] font-bold text-white">
                {user.name.slice(0, 1)}
              </span>
              <span className="hidden text-ink-900 sm:inline">{user.name}</span>
              <span className="hidden text-[11px] text-ink-400 sm:inline">
                {user.role === "client" ? "건물주" : "전문가"}
              </span>
            </Link>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 sm:px-8 sm:py-10">{children}</main>
    </div>
  );
}
