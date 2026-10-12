import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server/auth";
import LogoutButton from "@/components/LogoutButton";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-slate-100">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-5 py-3.5">
          <Link href="/" className="text-base font-extrabold tracking-tight text-slate-900">
            Work<span className="text-blue-600">Bridge</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/projects" className="font-semibold text-slate-700">
              프로젝트
            </Link>
            <Link href="/profile" className="font-semibold text-slate-700">
              내 프로필
            </Link>
            <span className="text-slate-400">
              {user.name}
              <span className="ml-1 text-xs">
                ({user.role === "client" ? "건물주" : "전문가"})
              </span>
            </span>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8">{children}</main>
    </div>
  );
}
