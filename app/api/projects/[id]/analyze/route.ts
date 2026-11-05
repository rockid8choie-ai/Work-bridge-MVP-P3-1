import { prisma } from "@/lib/server/db";
import { ApiError, fail, ok, readJson } from "@/lib/server/api";
import { requireRole, requireUser } from "@/lib/server/guard";
import { analyzeProject } from "@/lib/server/scope/analyze";

export const runtime = "nodejs";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

/** 최신 분석 리포트 — 건물주(소유자) 또는 선정된 전문가 */
export async function GET(_: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const project = await prisma.project.findFirst({
      where: { id, deletedAt: null },
      select: { clientId: true, budget: true, applications: { where: { status: "accepted", freelancerId: user.id }, select: { id: true } } },
    });
    if (!project) throw new ApiError(404, "NOT_FOUND", "프로젝트를 찾을 수 없어요");
    if (project.clientId !== user.id && project.applications.length === 0) throw new ApiError(403, "FORBIDDEN", "당사자만 볼 수 있어요");

    const analysis = await prisma.scopeAnalysis.findFirst({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
    return ok({ analysis, budget: project.budget });
  } catch (error) {
    return fail(error);
  }
}

/**
 * AI 분석 요청 (A-01) — 건물주만. body { applyBudget?: boolean } 이면 바로 예산 반영까지 (A-02).
 * 재분석 가능. 계약이 체결된 뒤에는 범위가 사본으로 얼어 있으므로 다시 분해하지 않는다.
 */
export async function POST(request: Request, { params }: Ctx) {
  try {
    const user = await requireRole("client");
    const { id } = await params;
    const body = (await readJson(request).catch(() => ({}))) as { applyBudget?: boolean };

    const project = await prisma.project.findFirst({
      where: { id, deletedAt: null },
      select: { clientId: true, contract: { select: { id: true } } },
    });
    if (!project) throw new ApiError(404, "NOT_FOUND", "프로젝트를 찾을 수 없어요");
    if (project.clientId !== user.id) throw new ApiError(403, "FORBIDDEN", "내 공사만 분석할 수 있어요");
    if (project.contract) throw new ApiError(409, "CONTRACT_EXISTS", "계약서가 만들어진 뒤에는 다시 분해할 수 없어요");

    const analysis = await analyzeProject(id);

    let budgetApplied = false;
    if (body.applyBudget) budgetApplied = await applyBudget(id, analysis.totalEstimate);

    return ok({ analysis, budgetApplied }, 201);
  } catch (error) {
    return fail(error);
  }
}

/** 예산 반영 (A-02) — 지원자가 있으면 예산이 잠겨 있다 (B-08) */
export async function PATCH(_: Request, { params }: Ctx) {
  try {
    const user = await requireRole("client");
    const { id } = await params;
    const project = await prisma.project.findFirst({ where: { id, clientId: user.id, deletedAt: null }, select: { id: true } });
    if (!project) throw new ApiError(404, "NOT_FOUND", "프로젝트를 찾을 수 없어요");
    const analysis = await prisma.scopeAnalysis.findFirst({ where: { projectId: id }, orderBy: { createdAt: "desc" }, select: { totalEstimate: true } });
    if (!analysis) throw new ApiError(409, "NO_ANALYSIS", "먼저 AI 분해를 실행해 주세요");
    const applied = await applyBudget(id, analysis.totalEstimate);
    if (!applied) throw new ApiError(409, "LOCKED_FIELDS", "지원자가 있는 공사는 예산을 바꿀 수 없어요");
    return ok({ budget: analysis.totalEstimate });
  } catch (error) {
    return fail(error);
  }
}

async function applyBudget(projectId: string, total: number) {
  const applicants = await prisma.application.count({ where: { projectId } });
  if (applicants > 0) return false;
  await prisma.project.update({ where: { id: projectId }, data: { budget: total } });
  return true;
}
