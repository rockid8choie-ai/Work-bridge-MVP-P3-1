import { fail, ok } from "@/lib/server/api";
import { requireRole } from "@/lib/server/guard";
import { createOrder } from "@/lib/server/payments";

export const runtime = "nodejs";

/** A-07/A-09 결제 주문 생성 — 체결된 계약의 건물주. 결제창을 띄우는 데 필요한 값만 돌려준다. */
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole("client");
    const { id } = await params;
    return ok({ order: await createOrder(id, user.id) }, 201);
  } catch (error) {
    return fail(error);
  }
}
