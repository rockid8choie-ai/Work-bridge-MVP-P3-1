"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import LogoutButton from "@/components/LogoutButton";

type Item = { href: string; label: string };
type User = {
  name: string;
  role: "client" | "freelancer";
  avatarUrl: string | null;
};

/**
 * 로그인 후 상단 메뉴. 데스크톱(md 이상)은 가로 메뉴, 모바일은 알림·아바타·햄버거만 두고
 * 나머지는 펼침 패널로 — 390px 에서 메뉴가 세로로 찌그러지던 문제(11/5 테스터 제보) 수정.
 */
export default function AppNav({
  menu,
  unread,
  user,
}: {
  menu: Item[];
  unread: number;
  user: User;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // 페이지가 바뀌면 패널을 닫는다 (렌더 중 상태 조정 패턴 — effect 안 setState 금지 규칙 대응)
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpen(false);
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");
  const badge =
    unread > 0 ? (
      <span className="absolute -top-0.5 right-0 min-w-4 rounded-full bg-danger-500 px-1 text-center text-[10px] font-bold leading-4 text-white">
        {unread > 99 ? "99+" : unread}
      </span>
    ) : null;
  const avatar = user.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={user.avatarUrl}
      alt=""
      className="size-7 rounded-full object-cover"
    />
  ) : (
    <span className="flex size-7 items-center justify-center rounded-full bg-ink-900 text-[11px] font-bold text-white">
      {user.name.slice(0, 1)}
    </span>
  );
  const roleLabel = user.role === "client" ? "건물주" : "전문가";

  return (
    <>
      {/* 데스크톱 */}
      <nav className="hidden items-center gap-2 text-[13.5px] font-medium md:flex">
        {menu.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className={`rounded-full px-3 py-1.5 transition-colors hover:bg-canvas-100 hover:text-ink-900 ${
              isActive(m.href) ? "bg-canvas-100 text-ink-900" : "text-ink-700"
            }`}
          >
            {m.label}
          </Link>
        ))}
        <Link
          href="/notifications"
          className="relative rounded-full px-3 py-1.5 text-ink-700 transition-colors hover:bg-canvas-100 hover:text-ink-900"
        >
          알림
          {badge}
        </Link>
        <Link
          href="/profile"
          className="ml-1 inline-flex items-center gap-2 rounded-full border border-line-200 bg-paper py-1 pl-1 pr-3 transition-colors hover:border-ink-400"
        >
          {avatar}
          <span className="text-ink-900">{user.name}</span>
          <span className="text-[11px] text-ink-400">{roleLabel}</span>
        </Link>
        <LogoutButton />
      </nav>

      {/* 모바일 */}
      <div className="flex items-center gap-1 md:hidden">
        <Link
          href="/notifications"
          aria-label={`알림 ${unread}건`}
          className="relative rounded-full p-2 text-ink-700 transition-colors hover:bg-canvas-100"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
          {badge}
        </Link>
        <Link
          href="/profile"
          aria-label="내 프로필"
          className="rounded-full p-1"
        >
          {avatar}
        </Link>
        <button
          type="button"
          aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="rounded-full p-2 text-ink-900 transition-colors hover:bg-canvas-100"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            {open ? (
              <>
                <path d="M6 6l12 12" />
                <path d="M18 6L6 18" />
              </>
            ) : (
              <>
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h16" />
              </>
            )}
          </svg>
        </button>
      </div>

      {open && (
        <>
          {/* 패널 바깥을 누르면 닫힌다 */}
          <button
            type="button"
            aria-label="메뉴 닫기"
            onClick={() => setOpen(false)}
            className="fixed inset-0 top-[57px] z-[-1] cursor-default bg-ink-900/20 md:hidden"
          />
          <div className="absolute inset-x-0 top-full border-b border-line-200/70 bg-paper shadow-2 md:hidden">
            <div className="mx-auto flex max-w-5xl flex-col px-3 py-2">
              <Link
                href="/profile"
                className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-canvas-50"
              >
                {avatar}
                <span className="flex flex-col leading-tight">
                  <span className="text-[15px] font-bold text-ink-900">
                    {user.name}
                  </span>
                  <span className="text-[12px] text-ink-400">
                    {roleLabel} · 내 프로필
                  </span>
                </span>
              </Link>
              <div className="my-1 h-px bg-line-100" />
              {[
                ...menu,
                {
                  href: "/notifications",
                  label: unread > 0 ? `알림 (${unread})` : "알림",
                },
              ].map((m) => (
                <Link
                  key={m.href}
                  href={m.href}
                  className={`rounded-xl px-3 py-3 text-[15px] font-semibold ${
                    isActive(m.href)
                      ? "bg-canvas-100 text-ink-900"
                      : "text-ink-700 hover:bg-canvas-50"
                  }`}
                >
                  {m.label}
                </Link>
              ))}
              <div className="my-1 h-px bg-line-100" />
              <div className="px-3 py-3 text-[15px] font-semibold">
                <LogoutButton className="text-danger-600 hover:text-danger-500" />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
