import { fail, ok } from "@/lib/server/api";
import { requireUser } from "@/lib/server/guard";
import { signContract } from "@/lib/server/deal";

export const runtime = "nodejs";

/** A-06 전자 서명 — 양측이 모두 서명하면 체결(마일스톤 생성 · 결제 대기) */
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    return ok(await signContract(id, user.id));
  } catch (error) {
    return fail(error);
  }
}
