import { fail, ok } from "@/lib/server/api";
import { requireUser } from "@/lib/server/guard";
import { listPayments } from "@/lib/server/payments";

export const runtime = "nodejs";

/** A-08 결제 내역 */
export async function GET() {
  try {
    const user = await requireUser();
    return ok({ payments: await listPayments(user.id, user.role) });
  } catch (error) {
    return fail(error);
  }
}
