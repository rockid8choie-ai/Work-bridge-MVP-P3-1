import { fail, ok, readJson } from "@/lib/server/api";
import { requireRole } from "@/lib/server/guard";
import { acceptApplication, rejectApplication } from "@/lib/server/projects";
import { decisionSchema } from "@/lib/server/validators.application";

export const runtime = "nodejs";

/**
 * 지원자 수락 / 거절 (B-19, B-20).
 * 수락은 다섯 가지 변경이 한 트랜잭션으로 묶인다 — lib/server/projects.ts 참고.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole("client");
    const { id } = await params;
    const { action } = decisionSchema.parse(await readJson(request));

    const result =
      action === "accept" ? await acceptApplication(id, user.id) : await rejectApplication(id, user.id);

    return ok({ action, ...result });
  } catch (error) {
    return fail(error);
  }
}
