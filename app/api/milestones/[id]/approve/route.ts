import { fail, ok } from "@/lib/server/api";
import { requireRole } from "@/lib/server/guard";
import { approveMilestone } from "@/lib/server/deal";

export const runtime = "nodejs";

/** A-10/A-11 완료 승인 — 건물주. 수수료 10% 차감 후 지급액 기록, 전부 승인되면 완료. */
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole("client");
    const { id } = await params;
    return ok(await approveMilestone(id, user.id));
  } catch (error) {
    return fail(error);
  }
}
