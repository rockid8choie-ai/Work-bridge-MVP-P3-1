import { prisma } from "@/lib/server/db";
import { ApiError, fail, ok, readJson } from "@/lib/server/api";
import { requireRole } from "@/lib/server/guard";
import { scopeEditSchema } from "@/lib/server/scope/schema";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * 전문가 공정표 수정 (docs/06 5장) — 선정된 전문가만, 계약서 생성 전까지.
 * 고친 행은 editedBy 와 "[전문가 수정] 사유:" 접두어로 AI 원안과 구분된다. 분쟁 시 "누가 이 항목을 넣었나"가 남는다.
 * 분석이 없으면 전문가가 빈 표에서 새로 만든다.
 */
export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const user = await requireRole("freelancer");
    const { id } = await params;
    const { items } = scopeEditSchema.parse(await readJson(request));

    const project = await prisma.project.findFirst({
      where: { id, deletedAt: null },
      select: {
        dealStatus: true,
        contract: { select: { id: true } },
        applications: { where: { status: "accepted", freelancerId: user.id }, select: { id: true, offerStatus: true } },
      },
    });
    if (!project) throw new ApiError(404, "NOT_FOUND", "프로젝트를 찾을 수 없어요");
    if (project.applications.length === 0) throw new ApiError(403, "FORBIDDEN", "선정된 전문가만 공정표를 고칠 수 있어요");
    if (project.contract || project.dealStatus !== "awaiting_contract") throw new ApiError(409, "LOCKED", "계약서가 만들어진 뒤에는 범위를 바꿀 수 없어요");
    if (project.applications[0].offerStatus === "pending") throw new ApiError(409, "OFFER_PENDING", "제시된 금액에 먼저 응답해 주세요. 거부하면 공사가 모집으로 돌아갑니다");

    const analysis = await prisma.$transaction(async (tx) => {
      let a = await tx.scopeAnalysis.findFirst({ where: { projectId: id }, orderBy: { createdAt: "desc" }, include: { items: true } });
      if (!a) {
        a = await tx.scopeAnalysis.create({ data: { projectId: id, totalEstimate: 0, model: "vendor" }, include: { items: true } });
      }
      const keep = new Set(items.map((i) => i.id).filter(Boolean) as string[]);
      await tx.scopeItem.deleteMany({ where: { analysisId: a.id, id: { notIn: [...keep] } } });

      for (const [idx, it] of items.entries()) {
        const prev = it.id ? a.items.find((x) => x.id === it.id) : undefined;
        const changed =
          !prev || prev.name !== it.name || prev.description !== it.description || prev.estimate !== it.estimate || (it.quantity ?? null) !== prev.quantity;
        const base = prev?.rationale.replace(/^\[전문가 수정\][^\n]*\n/, "") ?? "전문가가 추가한 공정";
        const rationale = changed ? `[전문가 수정] 사유: ${it.reason?.trim() || "현장 기준으로 조정"}\n${base}` : prev!.rationale;
        const data = {
          sortOrder: idx,
          name: it.name,
          description: it.description,
          estimate: it.estimate,
          quantity: it.quantity ?? prev?.quantity ?? null,
          unit: it.unit ?? prev?.unit ?? null,
          conditional: it.conditional ?? prev?.conditional ?? false,
          rationale,
          ...(changed && { editedBy: user.id }),
        };
        if (prev) await tx.scopeItem.update({ where: { id: prev.id }, data });
        else await tx.scopeItem.create({ data: { ...data, analysisId: a.id, code: "ETC", editedBy: user.id } });
      }

      const total = items.reduce((s, i) => s + i.estimate, 0);
      return tx.scopeAnalysis.update({
        where: { id: a.id },
        data: { totalEstimate: total },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      });
    });

    return ok({ analysis });
  } catch (error) {
    return fail(error);
  }
}
