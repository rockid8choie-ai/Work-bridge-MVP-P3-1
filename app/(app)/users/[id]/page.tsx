import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/server/db";
import { dateKo } from "@/lib/shared/labels";

/**
 * 사용자 공개 프로필 (B-05, RFP 6장 기본 필수 화면).
 * 평균 별점과 리뷰 목록은 스프린트 2(A-13)에서 이 화면에 붙는다.
 */
export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      role: true,
      avatarUrl: true,
      bio: true,
      createdAt: true,
      clientProfile: { select: { buildingName: true, buildingType: true, region: true, website: true } },
      vendorProfile: {
        select: {
          mainCategory: true,
          years: true,
          hourlyRate: true,
          portfolioUrl: true,
          skills: { select: { skill: { select: { name: true } } } },
        },
      },
      _count: {
        select: {
          projects: { where: { deletedAt: null } },
          applications: { where: { status: "accepted" } },
        },
      },
    },
  });
  if (!user) notFound();

  const isClient = user.role === "client";

  return (
    <article className="card max-w-xl p-6 sm:p-8">
      <header className="flex items-center gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-line-100 text-xl font-bold text-ink-500">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt="" className="size-14 rounded-2xl object-cover" />
          ) : (
            user.name.slice(0, 1)
          )}
        </div>
        <div>
          <p className="text-[12px] font-bold text-accent-600">{isClient ? "건물주" : "유지보수 전문가"}</p>
          <h1 className="text-h2 text-ink-900">{user.name}</h1>
          <p className="text-[13px] text-ink-400">{dateKo(user.createdAt)} 가입</p>
        </div>
      </header>

      {user.bio && <p className="mt-5 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-700">{user.bio}</p>}

      {isClient && user.clientProfile && (
        <dl className="mt-6 grid grid-cols-2 gap-3 rounded-2xl bg-canvas-50 p-4 text-sm">
          <Item label="건물">{user.clientProfile.buildingName}</Item>
          <Item label="유형">{user.clientProfile.buildingType}</Item>
          <Item label="지역">{user.clientProfile.region}</Item>
          <Item label="등록한 공사">{user._count.projects}건</Item>
          {user.clientProfile.website && (
            <Item label="웹사이트">
              <a href={user.clientProfile.website} target="_blank" rel="noreferrer" className="text-accent-600">
                바로가기 ↗
              </a>
            </Item>
          )}
        </dl>
      )}

      {!isClient && user.vendorProfile && (
        <>
          <dl className="mt-6 grid grid-cols-2 gap-3 rounded-2xl bg-canvas-50 p-4 text-sm">
            <Item label="주요 분야">{user.vendorProfile.mainCategory}</Item>
            <Item label="경력">{user.vendorProfile.years}년</Item>
            <Item label="시간당 단가">{user.vendorProfile.hourlyRate.toLocaleString("ko-KR")}원</Item>
            <Item label="수락된 공사">{user._count.applications}건</Item>
            {user.vendorProfile.portfolioUrl && (
              <Item label="포트폴리오">
                <a href={user.vendorProfile.portfolioUrl} target="_blank" rel="noreferrer" className="text-accent-600">
                  바로가기 ↗
                </a>
              </Item>
            )}
          </dl>
          <section className="mt-5">
            <h2 className="text-h3 text-ink-900">전문분야</h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {user.vendorProfile.skills.map((s) => (
                <span key={s.skill.name} className="rounded-full border border-line-200 px-2.5 py-1 text-[13px] text-ink-700">
                  {s.skill.name}
                </span>
              ))}
            </div>
          </section>
        </>
      )}

      {((isClient && !user.clientProfile) || (!isClient && !user.vendorProfile)) && (
        <p className="mt-6 rounded-2xl bg-canvas-50 px-4 py-6 text-center text-sm text-ink-400">
          아직 프로필을 작성하지 않았어요
        </p>
      )}

      <section className="mt-8 rounded-card border border-dashed border-line-200 bg-canvas-50 p-5">
        <h2 className="text-h3 text-ink-900">평점과 리뷰</h2>
        <p className="mt-1.5 text-sm text-ink-500">거래가 완료되면 상호 평가가 여기에 쌓입니다.</p>
        <p className="mt-2 text-xs font-semibold text-ink-400">스프린트 2에서 구현</p>
      </section>

      <Link href="/projects" className="mt-8 inline-block text-sm font-semibold text-ink-400">
        ← 공사 찾기
      </Link>
    </article>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-caption text-ink-400">{label}</dt>
      <dd className="mt-0.5 font-bold text-ink-900">{children}</dd>
    </div>
  );
}
