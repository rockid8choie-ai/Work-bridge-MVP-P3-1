import Link from "next/link";
import { getCurrentUser } from "@/lib/server/auth";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-5 py-4">
        <span className="text-lg font-extrabold tracking-tight text-slate-900">
          Work<span className="text-blue-600">Bridge</span>
        </span>
        <nav className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <span className="text-slate-500">{user.name}님</span>
              <Link href="/projects" className="font-semibold text-slate-700">
                프로젝트
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="font-semibold text-slate-700">
                로그인
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white"
              >
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
          공사 분쟁의 원인은 가격이 아닙니다. 무엇을 하기로 했는지 문서가 없다는 것입니다.
          WorkBridge는 공사를 단위 공정으로 먼저 쪼개고, 그 항목이 그대로 계약 범위가 되고
          작업 단계가 되고 정산 단위가 됩니다.
        </p>

        <div className="mt-8">
          <Link
            href={user ? "/projects" : "/signup"}
            className="inline-block rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white"
          >
            {user ? "프로젝트 보기" : "시작하기"}
          </Link>
        </div>

        <dl className="mt-16 grid gap-6 sm:grid-cols-3">
          <Stat
            value="95.3%"
            label="가격이 아닌 분쟁"
            note="인테리어 분쟁 2,243건 중 하자보수·계약불이행 등 범위 관련 비중"
          />
          <Stat
            value="64.2%"
            label="합의 실패율"
            note="10건 중 6건은 합의조차 되지 않고 끝난다"
          />
          <Stat
            value="97%"
            label="비주거 비중"
            note="국내 리모델링 착공면적 중 비주거 건축물이 차지하는 비율"
          />
        </dl>
        <p className="mt-6 text-xs text-slate-400">
          출처: 한국소비자원(2026.10) · 한국건설산업연구원(2024.6)
        </p>
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
