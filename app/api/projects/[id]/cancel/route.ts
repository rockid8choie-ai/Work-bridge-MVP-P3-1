import { fail, ok } from "@/lib/server/api";
import { requireRole } from "@/lib/server/guard";
import { cancelProject } from "@/lib/server/projects";

export const runtime = "nodejs";

/** 프로젝트 취소 (B-32) — 계약 체결 전까지만 */
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole("client");
    const { id } = await params;
    const result = await cancelProject(id, user.id);
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}
