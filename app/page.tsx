import Link from "next/link";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { PROJECT_CATEGORIES } from "@/lib/shared/labels";

/**
 * 랜딩. 로그인 상태에 따라 헤더가 다르고(B-30),
 * 프로젝트 탐색으로 들어가는 길이 세 갈래다 — 헤더 메뉴 · 검색창 · 카테고리 버튼 (B-29).
 */
export default async function HomePage() {
  const user = await getCurrentUser();
  const unread = user ? await prisma.notification.count({ where: { userId: user.id, readAt: null } }) : 0;

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-5 py-4">
        <span className="text-lg font-extrabold tracking-tight text-slate-900">
          Work<span className="text-blue-600">Bridge</span>
        </span>
        <nav className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <Link href="/projects" className="font-semibold text-slate-700">
                프로젝트
              </Link>
              <Link
                href={user.role === "client" ? "/me/projects" : "/me/applications"}
                className="font-semibold text-slate-700"
              >
                {user.role === "client" ? "내 프로젝트" : "내 지원"}
              </Link>
              <Link href="/notifications" className="relative font-semibold text-slate-700">
                알림
                {unread > 0 && (
                  <span className="absolute -right-3.5 -top-1.5 min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-4 text-white">
                    {unread}
                  </span>
                )}
              </Link>
              <Link href="/profile" className="text-slate-500">
                {user.name}님
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="font-semibold text-slate-700">
                로그인
              </Link>
              <Link href="/signup" className="rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white">
                회원가입
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="mx-auto w-full max-w-3xl flex-1 px-5 py-16">
        <p className="text-sm font-bold text-blue-600">건물 유지보수 외주 매칭</p>
        <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl">
          가격을 먼저 합의하지 않습니다.
          <br />
          <span className="text-blue-600">범위</span>를 먼저 합의합니다.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600">
          공사 분쟁의 원인은 가격이 아닙니다. 무엇을 하기로 했는지 문서가 없다는 것입니다. WorkBridge는 공사를
          단위 공정으로 먼저 쪼개고, 그 항목이 그대로 계약 범위가 되고 작업 단계가 되고 정산 단위가 됩니다.
        </p>

        <form method="get" action="/projects" className="mt-8 flex max-w-xl gap-2">
          <input
            name="q"
            placeholder="누수, 전기, 옥상 방수… 어떤 공사를 찾으세요?"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-600"
          />
          <button type="submit" className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white">
            검색
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {PROJECT_CATEGORIES.map((c) => (
            <Link
              key={c}
              href={`/projects?category=${encodeURIComponent(c)}`}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-[13px] font-semibold text-slate-600 transition-colors hover:border-blue-600 hover:text-blue-700"
            >
              {c}
            </Link>
          ))}
        </div>

        {!user && (
          <div className="mt-8 flex gap-2">
            <Link href="/signup?role=client" className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white">
              건물주로 시작
            </Link>
            <Link href="/signup?role=freelancer" className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700">
              전문가로 시작
            </Link>
          </div>
        )}

        <dl className="mt-16 grid gap-6 sm:grid-cols-3">
          <Stat value="95.3%" label="가격이 아닌 분쟁" note="인테리어 분쟁 2,243건 중 하자보수·계약불이행 등 범위 관련 비중" />
          <Stat value="64.2%" label="합의 실패율" note="10건 중 6건은 합의조차 되지 않고 끝난다" />
          <Stat value="97%" label="비주거 비중" note="국내 리모델링 착공면적 중 비주거 건축물이 차지하는 비율" />
        </dl>
        <p className="mt-6 text-xs text-slate-400">출처: 한국소비자원(2026.10) · 한국건설산업연구원(2024.6)</p>
      </section>
    </main>
  );
}

function Stat({ value, label, note }: { value: string; label: string; note: string }) {
  return (
    <div>
      <dt className="text-2xl font-extrabold text-slate-900">{value}</dt>
      <dd className="mt-1 text-sm font-semibold text-slate-700">{label}</dd>
      <dd className="mt-1 text-xs leading-relaxed text-slate-500">{note}</dd>
    </div>
  );
}
