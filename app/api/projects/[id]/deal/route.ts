import { fail, ok } from "@/lib/server/api";
import { requireUser } from "@/lib/server/guard";
import { assertParty, loadDeal } from "@/lib/server/deal";

export const runtime = "nodejs";

/** 거래 화면 데이터 — 당사자(건물주·선정 전문가)만. 화면 새로고침용. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const deal = await loadDeal(id);
    const party = assertParty(deal, user.id);
    return ok({ ...party, project: deal.project, application: deal.application, analysis: deal.analysis });
  } catch (error) {
    return fail(error);
  }
}
