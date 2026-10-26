import Link from "next/link";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { projectCardSelect } from "@/lib/server/projects.query";
import { PROJECT_CATEGORIES } from "@/lib/shared/labels";
import Logo from "@/components/Logo";
import CategoryIcon from "@/components/CategoryIcon";
import ProjectCard from "@/components/ProjectCard";

/**
 * 랜딩 — docs/11 디자인 시스템 6장 "홈" 구성.
 * 히어로(다크) → 작동 방식 3단계(벤토) → 비교 + 숫자 → 모집 중인 공사 → CTA 밴드 → 푸터.
 * 프로젝트 탐색으로 들어가는 길은 헤더 메뉴 · 문제 서술 인풋 · 카테고리 chips (B-29, B-30).
 * 인풋 제출은 아직 기존 검색(/projects?q=)으로 간다. 0단계 AI 추출은 스프린트 2.
 */
export default async function HomePage() {
  const user = await getCurrentUser();
  const [unread, latest] = await Promise.all([
    user ? prisma.notification.count({ where: { userId: user.id, readAt: null } }) : 0,
    prisma.project.findMany({
      where: { deletedAt: null, recruitStatus: "open" },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: projectCardSelect,
    }),
  ]);
  const heroCategories = PROJECT_CATEGORIES.filter((c) => c !== "기타");

  return (
    <main className="flex flex-1 flex-col">
      {/* 헤더: 다크 히어로 위에 얹히는 투명 헤더 */}
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Logo invert />
          <nav className="flex items-center gap-2 text-label sm:gap-5">
            {user ? (
              <>
                <Link href="/projects" className="hidden text-white/80 hover:text-white sm:inline">
                  공사 찾기
                </Link>
                <Link
                  href={user.role === "client" ? "/me/projects" : "/me/applications"}
                  className="hidden text-white/80 hover:text-white sm:inline"
                >
                  {user.role === "client" ? "내 건물 공사" : "내 지원"}
                </Link>
                <Link href="/notifications" className="relative text-white/80 hover:text-white">
                  알림
                  {unread > 0 && (
                    <span className="absolute -right-3.5 -top-1.5 min-w-4 rounded-full bg-accent-500 px-1 text-center text-[10px] font-bold leading-4 text-white">
                      {unread}
                    </span>
                  )}
                </Link>
                <Link href="/profile" className="btn-ghost-light px-4 py-2 text-[13px]">
                  {user.name}님
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="text-white/80 hover:text-white">
                  로그인
                </Link>
                <Link href="/signup" className="btn-ghost-light px-4 py-2 text-[13px]">
                  회원가입
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* 히어로 */}
      <section className="bg-night relative overflow-hidden text-white">
        <div className="mx-auto w-full max-w-6xl px-5 pb-20 pt-32 sm:px-8 sm:pb-28 sm:pt-40">
          <p className="rise inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3.5 py-1.5 text-[12px] font-semibold text-white/85 backdrop-blur">
            <span className="size-1.5 rounded-full bg-accent-400" />
            건물 유지보수 외주 매칭 · 범위 먼저 계약
          </p>
          <h1 className="rise rise-1 mt-6 max-w-4xl text-display-sm sm:text-display">
            가격보다 먼저,
            <br />
            <span className="text-gradient">‘계약 범위’</span>를 합의합니다.
          </h1>
          <p className="rise rise-2 mt-6 max-w-3xl text-body text-white/70 sm:text-body-lg">
            공사 다툼은 대부분 가격 때문이 아닙니다. “무엇을 해주기로 했는지”를 적어 두지 않아서 생깁니다.{" "}
            <br className="hidden sm:block" />
            BFS Working Bridge는 공사를 작업 항목으로 나눠 적고, 그 목록대로 계약하고 그 목록대로 정산합니다.
          </p>

          <form method="get" action="/projects" className="rise rise-3 mt-10 max-w-3xl">
            <label htmlFor="hero-q" className="sr-only">
              어떤 문제가 있나요?
            </label>
            <div className="flex items-center gap-2 rounded-full bg-white p-2 pl-5 shadow-3 focus-within:shadow-glow">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="size-5 shrink-0 text-ink-400"
                aria-hidden
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                id="hero-q"
                name="q"
                placeholder="어떤 문제가 있나요? 예: 3층 화장실 천장에서 물이 새요"
                className="h-12 min-w-0 flex-1 bg-transparent text-[15px] text-ink-900 outline-none focus-visible:outline-none sm:text-base"
              />
              <button type="submit" className="btn-accent h-12 shrink-0 px-6 text-[15px]">
                공사 찾기
              </button>
            </div>
          </form>

          <div className="rise rise-3 mt-5 flex flex-wrap gap-2">
            {heroCategories.map((c) => (
              <Link
                key={c}
                href={`/projects?category=${encodeURIComponent(c)}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/6 px-3.5 py-2 text-[13px] font-medium text-white/80 backdrop-blur transition-colors hover:border-white/30 hover:bg-white/12 hover:text-white"
              >
                <CategoryIcon name={c} className="size-4" />
                {c}
              </Link>
            ))}
          </div>

          <div className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-white/10 pt-6 text-[13px] text-white/55">
            <span>
              <strong className="font-semibold text-white/85">95.3%</strong> 공사 분쟁은 가격이 아닌 범위 문제
            </span>
            <span>
              <strong className="font-semibold text-white/85">10건 중 6건</strong> 합의조차 못 하고 끝남
            </span>
            <span className="text-white/40">출처 한국소비자원 2026.10</span>
          </div>
        </div>
      </section>

      {/* 작동 방식: 벤토 3단계 */}
      <section className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <p className="text-eyebrow text-accent-700">How it works</p>
        <h2 className="mt-3 text-h1 text-ink-900">한 번 나누고, 끝까지 씁니다.</h2>
        <p className="mt-3 max-w-2xl text-body text-ink-500">
          문제를 적으면 작업 항목으로 나뉩니다. 그 목록이 그대로 계약서가 되고, 작업 단계가 되고, 정산 기준이
          됩니다.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <StepCard n="01" title="문제를 적습니다" desc="사진 없이도 됩니다. 어디서 무엇이 불편한지 한 줄이면 충분합니다.">
            <div className="rounded-2xl border border-line-200 bg-paper p-4 text-[13px] text-ink-700 shadow-1">
              <p className="text-ink-400">문제</p>
              <p className="mt-1 font-medium text-ink-900">3층 화장실 천장에서 물이 떨어져요. 비 오는 날 더 심해요.</p>
            </div>
          </StepCard>

          <StepCard n="02" title="작업 항목으로 나눕니다" desc="해야 할 일이 항목별로 적힙니다. 범위가 눈에 보이니 빠진 것도 보입니다.">
            <ul className="space-y-1.5 text-[13px]">
              {[
                ["누수 원인 탐지", "15만"],
                ["천장 석고보드 철거", "18만"],
                ["옥상 방수층 보수", "120만"],
                ["천장 마감 복구", "42만"],
              ].map(([t, p]) => (
                <li
                  key={t}
                  className="flex items-center justify-between rounded-xl border border-line-200 bg-paper px-3 py-2 shadow-1"
                >
                  <span className="flex items-center gap-2 text-ink-900">
                    <span className="size-4 rounded-md border-2 border-accent-500 bg-accent-50" />
                    {t}
                  </span>
                  <span className="font-semibold text-ink-700">{p}</span>
                </li>
              ))}
            </ul>
          </StepCard>

          <StepCard n="03" title="그 목록대로 계약하고 정산합니다" desc="항목이 곧 계약 범위입니다. 끝난 항목만 단계별로 지급됩니다.">
            <div className="space-y-2.5 text-[13px]">
              {MILESTONES.map((m) => (
                <div key={m.label}>
                  <div className="flex justify-between text-ink-700">
                    <span>{m.label}</span>
                    <span className={m.pct === 100 ? "font-semibold text-ok-600" : "text-ink-400"}>{m.state}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-line-100">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-accent-500 to-accent-700"
                      style={{ width: `${m.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </StepCard>
        </div>
      </section>

      {/* 비교 + 숫자 */}
      <section className="bg-canvas-50">
        <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <p className="text-eyebrow text-accent-700">Why scope first</p>
          <h2 className="mt-3 text-h1 text-ink-900">입찰은 가격을 정합니다. 우리는 범위를 정합니다.</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <div className="card p-7">
              <p className="text-label text-ink-400">일반 입찰·견적 비교 플랫폼</p>
              <ul className="mt-4 space-y-3 text-body text-ink-700">
                <Row bad>가장 싼 가격부터 고릅니다</Row>
                <Row bad>공사 범위는 “내부 / 외부” 같은 구분뿐</Row>
                <Row bad>추가 공사비가 나오면 당사자끼리 다툽니다</Row>
                <Row bad>돈은 한 번에, 공사가 끝나기 전에</Row>
              </ul>
            </div>
            <div className="card relative overflow-hidden p-7 ring-2 ring-accent-500/60">
              <span className="absolute right-5 top-5 rounded-full bg-accent-50 px-2.5 py-1 text-[11px] font-bold text-accent-700">
                BFS Working Bridge
              </span>
              <p className="text-label text-ink-400">범위 먼저 계약</p>
              <ul className="mt-4 space-y-3 text-body text-ink-900">
                <Row>해야 할 일부터 항목으로 적습니다</Row>
                <Row>그 목록이 그대로 계약 범위 조항</Row>
                <Row>변경은 항목을 추가하고 기록으로 남깁니다</Row>
                <Row>끝난 단계만, 승인 뒤 지급</Row>
              </ul>
            </div>
          </div>
          <dl className="mt-12 grid gap-4 sm:grid-cols-3">
            <Stat value="95.3%" label="가격이 아닌 분쟁" note="인테리어 분쟁 2,243건 중 하자보수·계약불이행 등 범위 관련 비중" />
            <Stat value="64.2%" label="합의 실패율" note="10건 중 6건은 합의조차 되지 않고 끝난다" />
            <Stat value="97%" label="비주거 비중" note="국내 리모델링 착공면적 중 비주거 건축물이 차지하는 비율" />
          </dl>
          <p className="mt-5 text-caption text-ink-400">출처: 한국소비자원(2026.10) · 한국건설산업연구원(2024.6)</p>
        </div>
      </section>

      {/* 모집 중인 공사 */}
      {latest.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-eyebrow text-accent-700">Open now</p>
              <h2 className="mt-3 text-h1 text-ink-900">지금 모집 중인 공사</h2>
            </div>
            <Link href="/projects" className="btn-secondary px-4 py-2 text-[13px]">
              전체 보기 →
            </Link>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {latest.map((p) => (
              <ProjectCard
                key={p.id}
                p={{
                  id: p.id,
                  title: p.title,
                  category: p.category,
                  budget: p.budget,
                  deadlineAt: p.deadlineAt,
                  recruitStatus: p.recruitStatus,
                  skills: p.skills.map((s) => s.skill.name),
                  applicationCount: p._count.applications,
                  region: p.client.clientProfile?.region ?? null,
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* CTA 밴드 */}
      <section className="mx-auto w-full max-w-6xl px-5 pb-20 sm:px-8 sm:pb-28">
        <div className="bg-night overflow-hidden rounded-panel px-7 py-14 text-center text-white sm:px-12 sm:py-20">
          <h2 className="text-display-sm sm:text-[48px] sm:leading-[1.08]">
            오늘 올린 공사,
            <br className="sm:hidden" /> 내일 범위가 정해집니다.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-body text-white/65">
            건물주는 문제만 적고, 전문가는 항목을 보고 지원합니다. 가격 흥정은 그 다음입니다.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href={user ? "/projects/new" : "/signup?role=client"} className="btn-accent h-12 px-7 text-[15px]">
              건물주로 시작
            </Link>
            <Link href={user ? "/projects" : "/signup?role=freelancer"} className="btn-ghost-light h-12 px-7 text-[15px]">
              전문가로 시작
            </Link>
          </div>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="border-t border-line-100">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-10 text-[13px] text-ink-400 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Logo size="sm" />
          <nav className="flex flex-wrap gap-5">
            <Link href="/projects" className="hover:text-ink-900">
              공사 찾기
            </Link>
            <Link href="/login" className="hover:text-ink-900">
              로그인
            </Link>
            <Link href="/signup" className="hover:text-ink-900">
              회원가입
            </Link>
            <a href="https://github.com/rockid8choie-ai/Work-bridge-MVP-P3-1" className="hover:text-ink-900">
              GitHub
            </a>
          </nav>
          <p>© 2026 BFS Working Bridge</p>
        </div>
      </footer>
    </main>
  );
}

const MILESTONES = [
  { label: "1단계 · 탐지·철거", pct: 100, state: "지급 완료" },
  { label: "2단계 · 방수 보수", pct: 60, state: "작업 중" },
  { label: "3단계 · 마감 복구", pct: 0, state: "대기" },
];

function StepCard({ n, title, desc, children }: { n: string; title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="card card-hover flex flex-col p-6">
      <span className="text-[13px] font-bold tracking-wider text-accent-600">{n}</span>
      <h3 className="mt-2 text-h3 text-ink-900">{title}</h3>
      <p className="mt-1.5 text-[14px] leading-relaxed text-ink-500">{desc}</p>
      <div className="mt-5 flex-1 rounded-2xl bg-canvas-50 p-4">{children}</div>
    </div>
  );
}

function Row({ children, bad = false }: { children: React.ReactNode; bad?: boolean }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={`mt-1 flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
          bad ? "bg-line-100 text-ink-400" : "bg-accent-50 text-accent-700"
        }`}
      >
        {bad ? "–" : "✓"}
      </span>
      <span>{children}</span>
    </li>
  );
}

function Stat({ value, label, note }: { value: string; label: string; note: string }) {
  return (
    <div className="card p-6">
      <dt className="text-display-sm text-ink-900">{value}</dt>
      <dd className="mt-1 text-label font-semibold text-ink-900">{label}</dd>
      <dd className="mt-1 text-caption leading-relaxed text-ink-500">{note}</dd>
    </div>
  );
}
