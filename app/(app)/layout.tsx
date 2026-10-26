import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import LogoutButton from "@/components/LogoutButton";

/**
 * 로그인 후 공통 헤더. 역할별로 메뉴가 다르고(B-30), 미확인 알림 수가 즉시 보인다 (B-25).
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const unread = await prisma.notification.count({ where: { userId: user.id, readAt: null } });

  const menu =
    user.role === "client"
      ? [
          { href: "/projects", label: "프로젝트" },
          { href: "/me/projects", label: "내 프로젝트" },
        ]
      : [
          { href: "/projects", label: "프로젝트" },
          { href: "/me/applications", label: "내 지원" },
          { href: "/me/bookmarks", label: "북마크" },
        ];

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line-200">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-5 py-3.5">
          <Link href="/" className="text-base font-bold tracking-tight text-ink-900">
            Work<span className="text-accent-600">Bridge</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            {menu.map((m) => (
              <Link key={m.href} href={m.href} className="font-semibold text-ink-700">
                {m.label}
              </Link>
            ))}
            <Link href="/notifications" className="relative font-semibold text-ink-700">
              알림
              {unread > 0 && (
                <span className="absolute -right-3.5 -top-1.5 min-w-4 rounded-full bg-danger-500 px-1 text-center text-[10px] font-bold leading-4 text-white">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
            <Link href="/profile" className="font-semibold text-ink-700">
              내 프로필
            </Link>
            <span className="hidden text-ink-400 sm:inline">
              {user.name}
              <span className="ml-1 text-xs">({user.role === "client" ? "건물주" : "전문가"})</span>
            </span>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8">{children}</main>
    </div>
  );
}
