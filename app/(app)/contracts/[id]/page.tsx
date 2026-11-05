import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/auth";
import type { SnapshotItem } from "@/lib/server/deal";
import { dateKo, won } from "@/lib/shared/labels";

/**
 * 계약서 전문 (A-05, A-06 체결 후 상시 조회). 당사자만.
 * 공사 범위 조항 = 체결 시점 범위표 사본. 원본 범위표가 나중에 바뀌어도 이 문서는 바뀌지 않는다.
 */
export default async function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/contracts/${id}`)}`);

  const c = await prisma.contract.findUnique({
    where: { id },
    include: {
      project: { include: { client: { select: { id: true, name: true, email: true, clientProfile: true } } } },
      application: { include: { freelancer: { select: { id: true, name: true, email: true, vendorProfile: { select: { mainCategory: true } } } } } },
    },
  });
  if (!c || c.project.deletedAt) notFound();
  const isParty = c.project.clientId === user.id || c.application.freelancerId === user.id;
  if (!isParty) redirect(`/projects/${c.projectId}`);

  const items = c.scopeSnapshot as unknown as SnapshotItem[];
  const client = c.project.client;
  const vendor = c.application.freelancer;
  const no = `WB-${c.createdAt.getFullYear()}-${c.id.slice(-6).toUpperCase()}`;

  return (
    <article className="card max-w-3xl p-6 sm:p-10">
      <Link href={`/projects/${c.projectId}/deal`} className="text-sm font-semibold text-ink-400">
        ← 거래 화면
      </Link>

      <header className="mt-5 border-b border-line-200 pb-5">
        <p className="text-caption text-ink-400">계약번호 {no}</p>
        <h1 className="mt-1 text-h1 text-ink-900">건물 유지보수 공사 계약서</h1>
        <p className="mt-2 text-sm text-ink-500">{c.project.title}</p>
        <p className="mt-3">
          {c.signedAt ? (
            <span className="rounded-full bg-ok-50 px-2.5 py-1 text-[11px] font-semibold text-ok-700">{dateKo(c.signedAt)} 체결</span>
          ) : (
            <span className="rounded-full bg-warn-50 px-2.5 py-1 text-[11px] font-semibold text-warn-700">서명 대기 중 · 아직 효력이 없습니다</span>
          )}
        </p>
      </header>

      <section className="mt-6">
        <h2 className="text-h3 text-ink-900">제1조 당사자</h2>
        <dl className="mt-2 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-control bg-canvas-50 p-3">
            <dt className="text-caption text-ink-400">발주자 (건물주, 이하 &ldquo;갑&rdquo;)</dt>
            <dd className="mt-0.5 font-bold text-ink-900">{client.name}</dd>
            <dd className="text-[13px] text-ink-500">{client.email}{client.clientProfile && ` · ${client.clientProfile.buildingName} (${client.clientProfile.region})`}</dd>
          </div>
          <div className="rounded-control bg-canvas-50 p-3">
            <dt className="text-caption text-ink-400">시공자 (유지보수 전문가, 이하 &ldquo;을&rdquo;)</dt>
            <dd className="mt-0.5 font-bold text-ink-900">{vendor.name}</dd>
            <dd className="text-[13px] text-ink-500">{vendor.email}{vendor.vendorProfile && ` · ${vendor.vendorProfile.mainCategory}`}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-6">
        <h2 className="text-h3 text-ink-900">제2조 공사 범위</h2>
        <p className="mt-1 text-[13px] text-ink-500">
          을은 아래 각 호의 공정을 수행한다. 각 호는 작업 단계이자 대금 지급 단위이다. 아래에 없는 작업은 본 계약의 범위에 포함되지
          않으며, 범위 변경은 요청자와 사유를 기록해 양 당사자가 합의한다.
        </p>
        <ol className="mt-3 divide-y divide-line-100 rounded-control border border-line-200">
          {items.map((it, i) => (
            <li key={i} className="p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-ink-900">
                    {i + 1}. {it.name}
                    {it.conditional && <span className="ml-2 rounded-full bg-warn-50 px-1.5 py-0.5 text-[10px] font-semibold text-warn-700">진단 후 확정</span>}
                  </p>
                  <p className="mt-0.5 text-[13px] text-ink-700">{it.description}{it.quantity != null && it.unit && ` (${it.quantity}${it.unit})`}</p>
                  <p className="mt-1 text-[12px] text-ink-400">근거: {it.rationale}</p>
                </div>
                <span className="shrink-0 font-bold tabular-nums text-ink-900">{won(it.estimate)}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-6">
        <h2 className="text-h3 text-ink-900">제3조 계약 금액과 기간</h2>
        <dl className="mt-2 grid grid-cols-2 gap-3 rounded-control bg-canvas-50 p-3 text-sm sm:grid-cols-4">
          <div><dt className="text-caption text-ink-400">총 계약 금액</dt><dd className="font-bold text-ink-900">{won(c.agreedAmount)}</dd></div>
          <div><dt className="text-caption text-ink-400">공사 기간</dt><dd className="font-bold text-ink-900">{c.durationDays}일</dd></div>
          <div><dt className="text-caption text-ink-400">공정 수</dt><dd className="font-bold text-ink-900">{items.length}개</dd></div>
          <div><dt className="text-caption text-ink-400">플랫폼 수수료</dt><dd className="font-bold text-ink-900">10%</dd></div>
        </dl>
      </section>

      <section className="mt-6 space-y-3 text-[13.5px] leading-relaxed text-ink-700">
        <div>
          <h2 className="text-h3 text-ink-900">제4조 대금 지급 (에스크로)</h2>
          <p className="mt-1">갑은 계약 체결 후 총 계약 금액 전액을 플랫폼에 선결제한다. 을이 제2조 각 호의 공정을 완료해 승인을 요청하고 갑이 승인하면, 해당 호의 금액에서 플랫폼 수수료 10%를 차감한 금액을 을에게 지급한다. 승인되지 않은 공정의 금액은 플랫폼이 보관한다.</p>
        </div>
        <div>
          <h2 className="text-h3 text-ink-900">제5조 범위 변경</h2>
          <p className="mt-1">시공 중 제2조의 범위를 바꿔야 할 때는 요청자, 사유, 변경 내용을 기록하고 양 당사자가 합의한다. 을의 요청으로 동질·동가의 자재로 바꾸는 경우 갑은 추가 비용을 부담하지 않고, 갑의 요청에 따른 변경 비용은 갑이 부담한다 (소비자분쟁해결기준 실내건축공사업 3·4호 준용).</p>
        </div>
        <div>
          <h2 className="text-h3 text-ink-900">제6조 하자 판정</h2>
          <p className="mt-1">하자 여부는 제2조 각 호에 적힌 내용과 근거를 기준으로 판정한다. 본 계약서의 공사 범위는 체결 시점의 사본으로 고정되며, 이후 범위표 원본이 수정되어도 본 계약서는 변경되지 않는다.</p>
        </div>
        <div>
          <h2 className="text-h3 text-ink-900">제7조 해지</h2>
          <p className="mt-1">계약 체결 전에는 갑이 공사를 취소할 수 있다. 체결 후의 해지와 환불은 플랫폼 환불 절차에 따른다.</p>
        </div>
      </section>

      <section className="mt-8 grid gap-3 border-t border-line-200 pt-6 sm:grid-cols-2">
        <Sig who="갑 (건물주)" name={client.name} at={c.clientSignedAt} />
        <Sig who="을 (전문가)" name={vendor.name} at={c.freelancerSignedAt} />
      </section>
      <p className="mt-4 text-[11.5px] text-ink-400">전자 서명은 로그인한 당사자가 계약서 전문을 확인하고 서명 버튼을 누른 시각을 서버가 기록한 것입니다. 생성 {dateKo(c.createdAt)}.</p>
    </article>
  );
}

function Sig({ who, name, at }: { who: string; name: string; at: Date | null }) {
  return (
    <div className={`rounded-control border p-4 ${at ? "border-ok-600 bg-ok-50" : "border-dashed border-line-200"}`}>
      <p className="text-caption text-ink-400">{who}</p>
      <p className="mt-1 text-lg font-bold text-ink-900">{name}</p>
      <p className={`mt-1 text-[12.5px] ${at ? "text-ok-700" : "text-ink-400"}`}>{at ? `전자 서명 ${at.toLocaleString("ko-KR")}` : "미서명"}</p>
    </div>
  );
}
