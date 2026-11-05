import { z } from "zod";
import { fail, ok, readJson } from "@/lib/server/api";
import { requireUser } from "@/lib/server/guard";
import { signContract } from "@/lib/server/deal";

export const runtime = "nodejs";

/** 서명 패드가 만든 PNG data URL. 300KB 상한 — 손글씨 한 줄은 보통 10~40KB */
const signSchema = z.object({
  name: z.string().trim().min(2, "서명자 이름을 2자 이상 적어 주세요").max(40),
  signature: z
    .string()
    .regex(/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/, "서명 이미지가 올바르지 않아요")
    .max(300_000, "서명 이미지가 너무 커요"),
});

/** A-06 전자 서명 — 서명 이미지·이름을 받아 기록. 양측이 모두 서명하면 체결(마일스톤 생성 · 결제 대기) */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = signSchema.parse(await readJson(request));
    return ok(await signContract(id, user.id, body));
  } catch (error) {
    return fail(error);
  }
}
