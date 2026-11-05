import { z } from "zod";
import { fail, ok, readJson } from "@/lib/server/api";
import { requireRole } from "@/lib/server/guard";
import { confirmPayment } from "@/lib/server/payments";

export const runtime = "nodejs";

const schema = z.object({
  paymentKey: z.string().min(1).max(200),
  orderId: z.string().min(6).max(64),
  amount: z.coerce.number().int().positive(),
});

/** A-07 콜백 검증 — successUrl 로 돌아온 브라우저가 호출. 금액은 서버 저장값과 대조한 뒤 토스 승인 API 를 부른다. */
export async function POST(request: Request) {
  try {
    const user = await requireRole("client");
    const body = schema.parse(await readJson(request));
    return ok(await confirmPayment(body, user.id));
  } catch (error) {
    return fail(error);
  }
}
