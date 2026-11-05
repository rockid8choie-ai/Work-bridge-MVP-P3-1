import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/auth";
import { loadDeal, type SnapshotItem } from "@/lib/server/deal";
import { DEAL_LABEL, DEAL_STYLE } from "@/lib/shared/labels";
import DealStepper from "@/components/deal/DealStepper";
import ScopePanel from "@/components/deal/ScopePanel";
import OfferPanel from "@/components/deal/OfferPanel";
import ContractPanel from "@/components/deal/ContractPanel";
import PaymentPanel from "@/components/deal/PaymentPanel";
import MilestonePanel from "@/components/deal/MilestonePanel";
import ReviewPanel from "@/components/deal/ReviewPanel";
import type { DealView } from "@/components/deal/types";

/**
 * 거래 화면 — 수락 뒤 모든 단계가 여기서 돈다 (A-01 ~ A-12).
 * 범위표 → 금액 합의 → 계약서·서명 → 에스크로 결제 → 작업 단계 승인·정산 → 상호 평가.
 * 당사자(건물주 · 선정 전문가)만. 거래 단계 상태는 내부 화면에서만 보인다 (B-17).
 */
export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/projects/${id}/deal`)}`);

  const deal = await loadDeal(id).catch(() => null);
  if (!deal) notFound();

  const isClient = deal.project.clientId === user.id;
  const isFreelancer = deal.application?.freelancerId === user.id;
  if (!isClient && !isFreelancer) redirect(`/projects/${id}`);

  const applicants = await prisma.application.count({ where: { projectId: id } });
  const p = deal.project;
  const a = deal.application;
  const c = p.contract;

  const view: DealView = {
    projectId: p.id,
    title: p.title,
    category: p.category,
    description: p.description,
    budget: p.budget,
    dealStatus: p.dealStatus,
    client: { id: p.client.id, name: p.client.name, building: p.client.clientProfile?.buildingName ?? null, region: p.client.clientProfile?.region ?? null },
    freelancer: a ? { id: a.freelancer.id, name: a.freelancer.name, mainCategory: a.freelancer.vendorProfile?.mainCategory ?? null } : null,
    application: a ? { id: a.id, proposedAmount: a.proposedAmount, proposedDays: a.proposedDays } : null,
    offer: { amount: a?.offerAmount ?? null, days: a?.offerDays ?? null, message: a?.offerMessage ?? null, status: a?.offerStatus ?? null, offeredAt: a?.offeredAt?.toISOString() ?? null },
    analysis: deal.analysis
      ? {
          id: deal.analysis.id,
          totalEstimate: deal.analysis.totalEstimate,
          model: deal.analysis.model,
          assumptions: deal.analysis.assumptions,
          missingInfo: deal.analysis.missingInfo,
          confidence: deal.analysis.confidence,
          createdAt: deal.analysis.createdAt.toISOString(),
          items: deal.analysis.items.map((it) => ({
            id: it.id,
            sortOrder: it.sortOrder,
            name: it.name,
            description: it.description,
            estimate: it.estimate,
            rationale: it.rationale,
            quantity: it.quantity,
            unit: it.unit,
            conditional: it.conditional,
            editedBy: it.editedBy,
          })),
        }
      : null,
    contract: c
      ? {
          id: c.id,
          agreedAmount: c.agreedAmount,
          durationDays: c.durationDays,
          documentHash: c.documentHash,
          clientSignedAt: c.clientSignedAt?.toISOString() ?? null,
          clientSignName: c.clientSignName,
          clientSignature: c.clientSignature,
          freelancerSignedAt: c.freelancerSignedAt?.toISOString() ?? null,
          freelancerSignName: c.freelancerSignName,
          freelancerSignature: c.freelancerSignature,
          signedAt: c.signedAt?.toISOString() ?? null,
          createdAt: c.createdAt.toISOString(),
          scopeSnapshot: (c.scopeSnapshot as unknown as SnapshotItem[]).map((s) => ({ sortOrder: s.sortOrder, name: s.name, description: s.description, estimate: s.estimate, rationale: s.rationale, quantity: s.quantity, unit: s.unit, conditional: s.conditional })),
          milestones: c.milestones.map((m) => ({
            id: m.id,
            sortOrder: m.sortOrder,
            title: m.title,
            amount: m.amount,
            status: m.status,
            fee: m.fee,
            net: m.net,
            submittedAt: m.submittedAt?.toISOString() ?? null,
            approvedAt: m.approvedAt?.toISOString() ?? null,
            note: m.note,
          })),
          payments: c.payments.map((pay) => ({
            id: pay.id,
            pgOrderId: pay.pgOrderId,
            amount: pay.amount,
            status: pay.status,
            method: pay.method,
            receiptUrl: pay.receiptUrl,
            paidAt: pay.paidAt?.toISOString() ?? null,
          })),
        }
      : null,
    reviews: p.reviews.map((r) => ({ id: r.id, direction: r.direction, authorId: r.authorId, rating: r.rating, comment: r.comment, tags: r.tags, createdAt: r.createdAt.toISOString() })),
    me: { id: user.id, isClient, isFreelancer },
  };

  const frozen = Boolean(c);
  const cancelled = p.dealStatus === "cancelled";

  return (
    <div className="max-w-3xl space-y-4">
      <div className="card p-5 sm:p-6">
        <Link href={isClient ? "/me/projects" : "/me/applications"} className="text-sm font-semibold text-ink-400">
          ← {isClient ? "내 건물 공사" : "내 지원"}
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {p.dealStatus && <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${DEAL_STYLE[p.dealStatus]}`}>{DEAL_LABEL[p.dealStatus]}</span>}
          <span className="text-[13px] text-ink-500">{p.category}</span>
        </div>
        <h1 className="mt-2 text-h2 text-ink-900">
          <Link href={`/projects/${p.id}`}>{p.title}</Link>
        </h1>
        <p className="mt-1.5 text-[13px] text-ink-500">
          건물주 <b className="text-ink-700">{p.client.name}</b>
          {p.client.clientProfile?.buildingName && ` · ${p.client.clientProfile.buildingName}`}
          {a && (
            <>
              {" "}· 전문가 <Link href={`/users/${a.freelancer.id}`} className="font-bold text-ink-700">{a.freelancer.name}</Link>
            </>
          )}
        </p>
        {!cancelled && <DealStepper deal={view} />}
        {cancelled && <p className="mt-4 rounded-control bg-canvas-50 px-3 py-2.5 text-sm text-ink-500">취소된 공사예요.</p>}
      </div>

      {!cancelled && (
        <>
          <ScopePanel
            projectId={p.id}
            analysis={view.analysis}
            budget={p.budget}
            canAnalyze={isClient && !frozen}
            budgetLocked={applicants > 0}
            canEdit={isFreelancer && !frozen && a?.offerStatus !== "pending"}
            frozen={frozen}
          />
          {a && !c && <OfferPanel deal={view} />}
          {c && <ContractPanel deal={view} />}
          <PaymentPanel deal={view} />
          <MilestonePanel deal={view} />
          <ReviewPanel deal={view} />
        </>
      )}
    </div>
  );
}
