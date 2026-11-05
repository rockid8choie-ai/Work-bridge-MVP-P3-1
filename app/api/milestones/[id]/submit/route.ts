import { z } from "zod";
import { fail, ok, readJson } from "@/lib/server/api";
import { requireRole } from "@/lib/server/guard";
import { submitMilestone } from "@/lib/server/deal";

export const runtime = "nodejs";

const schema = z.object({ note: z.string().trim().max(500).optional() });

/** A-10 납품 요청 — 전문가 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole("freelancer");
    const { id } = await params;
    const body = schema.parse(await readJson(request).catch(() => ({})));
    return ok(await submitMilestone(id, user.id, body.note));
  } catch (error) {
    return fail(error);
  }
}
