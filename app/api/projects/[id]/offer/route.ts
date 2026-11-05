import { z } from "zod";
import { fail, ok, readJson } from "@/lib/server/api";
import { requireRole } from "@/lib/server/guard";
import { decideOffer, makeOffer } from "@/lib/server/deal";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const offerSchema = z.object({
  amount: z.coerce.number().int().min(10_000, "금액은 1만원 이상이어야 해요").max(1_000_000_000),
  days: z.coerce.number().int().min(1).max(365),
  message: z.string().trim().max(500).optional(),
});

const decisionSchema = z.object({ decision: z.enum(["agree", "decline"]) });

/** A-03 건물주 금액 제시 */
export async function POST(request: Request, { params }: Ctx) {
  try {
    const user = await requireRole("client");
    const { id } = await params;
    const body = offerSchema.parse(await readJson(request));
    return ok({ offer: await makeOffer(id, user.id, body) }, 201);
  } catch (error) {
    return fail(error);
  }
}

/** A-03 전문가 동의 → 계약서 생성 / A-04 거부 → 지원 거절 + 모집 복귀 */
export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const user = await requireRole("freelancer");
    const { id } = await params;
    const { decision } = decisionSchema.parse(await readJson(request));
    return ok(await decideOffer(id, user.id, decision));
  } catch (error) {
    return fail(error);
  }
}
