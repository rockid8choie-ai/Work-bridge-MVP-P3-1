import Link from "next/link";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { PROJECT_CATEGORIES } from "@/lib/shared/labels";

/**
 * 랜딩. 로그인 상태에 따라 헤더가 다르고(B-30),
 * 프로젝트 탐색으로 들어가는 길이 세 갈래다 — 헤더 메뉴 · 문제 서술 인풋 · 카테고리 chips (B-29).
 * 히어로 구성은 docs/08 5장(홈) — 한 줄 디스플레이 + 문제 서술 인풋 + 카테고리 pill 7개.
 * 인풋 제출은 아직 기존 검색(/projects?q=)으로 간다. 0단계 AI 추출은 스프린트 2.
 */
export default async function HomePage() {
  const user = await getCurrentUser();
  const unread = user ? await prisma.notification.count({ where: { userId: user.id, readAt: null } }) : 0;
  const heroCategories = PROJECT_CATEGORIES.filter((c) => c !== "기타");

  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b border-line-100">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-5 py-3.5">
          <span className="text-base font-bold tracking-tight text-ink-900">
            Work<span className="text-accent-600">Bridge</span>
          </span>
          <nav className="flex items-center gap-4 text-label">
            {user ? (
              <>
                <Link href="/projects" className="text-ink-700 hover:text-ink-900">
                  프로젝트
                </Link>
                <Link
                  href={user.role === "client" ? "/me/projects" : "/me/applications"}
                  className="text-ink-700 hover:text-ink-900"
                >
                  {user.role === "client" ? "내 프로젝트" : "내 지원"}
                </Link>
                <Link href="/notifications" className="relative text-ink-700 hover:text-ink-900">
                  알림
                  {unread > 0 && (
                    <span className="absolute -right-3.5 -top-1.5 min-w-4 rounded-full bg-accent-500 px-1 text-center text-[10px] font-bold leading-4 text-white">
                      {unread}
                    </span>
                  )}
                </Link>
                <Link href="/profile" className="text-ink-500 hover:text-ink-900">
                  {user.name}님
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="text-ink-700 hover:text-ink-900">
                  로그인
                </Link>
                <Link
                  href="/signup"
                  className="rounded-full bg-ink-900 px-4 py-2 font-semibold text-white transition-colors hover:bg-ink-700"
                >
                  회원가입
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="mx-auto w-full max-w-4xl flex-1 px-5 py-16 sm:py-20">
        <p className="text-label text-ink-500">가격을 먼저 합의하지 않습니다.</p>
        <h1 className="mt-3 text-3xl font-light leading-tight tracking-tight text-ink-900 sm:text-display">
          범위를 먼저 합의합니다.
        </h1>
        <p className="mt-5 max-w-xl text-body text-ink-700">
          공사 분쟁의 원인은 가격이 아니라, 무엇을 하기로 했는지 적어 둔 문서가 없다는 것입니다. WorkBridge는
          공사를 단위 공정으로 먼저 쪼개고, 그 항목이 그대로 계약 범위가 되고 작업 단계가 되고 정산 단위가 됩니다.
        </p>

        <form method="get" action="/projects" className="mt-10 max-w-2xl">
          <label htmlFor="hero-q" className="sr-only">
            어디가, 어떻게 문제인가요?
          </label>
          <div className="flex items-center gap-2 rounded-control border border-line-200 bg-paper p-1.5 shadow-1 focus-within:border-accent-500">
            <input
              id="hero-q"
              name="q"
              placeholder="어디가, 어떻게 문제인가요? 예: 3층 화장실 천장에서 물이 떨어져요"
              className="h-11 min-w-0 flex-1 bg-transparent px-3 text-body text-ink-900 outline-none focus-visible:outline-none"
            />
            <button
              type="submit"
              className="h-11 shrink-0 rounded-control bg-ink-900 px-5 text-label font-semibold text-white transition-colors hover:bg-ink-700"
            >
              공사 찾기
            </button>
          </div>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {heroCategories.map((c) => (
            <Link
              key={c}
              href={`/projects?category=${encodeURIComponent(c)}`}
              className="rounded-full border border-line-200 px-3.5 py-1.5 text-[13px] font-medium text-ink-700 transition-colors hover:border-ink-400 hover:text-ink-900"
            >
              {c}
            </Link>
          ))}
        </div>

        {!user && (
          <div className="mt-10 flex gap-2">
            <Link
              href="/signup?role=client"
              className="inline-flex h-11 items-center rounded-control bg-ink-900 px-5 text-label font-semibold text-white transition-colors hover:bg-ink-700"
            >
              건물주로 시작
            </Link>
            <Link
              href="/signup?role=freelancer"
              className="inline-flex h-11 items-center rounded-control border border-line-200 px-5 text-label font-semibold text-ink-900 transition-colors hover:border-ink-400"
            >
              전문가로 시작
            </Link>
          </div>
        )}

        <dl className="mt-16 grid gap-6 border-t border-line-100 pt-10 sm:grid-cols-3">
          <Stat value="95.3%" label="가격이 아닌 분쟁" note="인테리어 분쟁 2,243건 중 하자보수·계약불이행 등 범위 관련 비중" />
          <Stat value="64.2%" label="합의 실패율" note="10건 중 6건은 합의조차 되지 않고 끝난다" />
          <Stat value="97%" label="비주거 비중" note="국내 리모델링 착공면적 중 비주거 건축물이 차지하는 비율" />
        </dl>
        <p className="mt-6 text-caption text-ink-400">출처: 한국소비자원(2026.10) · 한국건설산업연구원(2024.6)</p>
      </section>
    </main>
  );
}

function Stat({ value, label, note }: { value: string; label: string; note: string }) {
  return (
    <div>
      <dt className="text-h2 text-ink-900">{value}</dt>
      <dd className="mt-1 text-label text-ink-700">{label}</dd>
      <dd className="mt-1 text-caption leading-relaxed text-ink-500">{note}</dd>
    </div>
  );
}
