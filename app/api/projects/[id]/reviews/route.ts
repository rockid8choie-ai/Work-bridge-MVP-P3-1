import { fail, ok, readJson } from "@/lib/server/api";
import { requireUser } from "@/lib/server/guard";
import { reviewSchema, writeReview } from "@/lib/server/reviews";

export const runtime = "nodejs";

/** A-12 상호 평가 — 완료된 공사의 당사자, 방향별 1회 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = reviewSchema.parse(await readJson(request));
    return ok({ review: await writeReview(id, user.id, body) }, 201);
  } catch (error) {
    return fail(error);
  }
}
