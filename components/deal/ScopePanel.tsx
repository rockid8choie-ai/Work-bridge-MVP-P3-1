"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiSend, ApiRequestError } from "@/lib/client/api";
import { won } from "@/lib/shared/labels";
import { ErrorText, inputClass } from "@/components/Field";
import type { AnalysisView, ScopeItemView } from "@/components/deal/types";

type Props = {
  projectId: string;
  analysis: AnalysisView | null;
  budget: number | null;
  /** 건물주 — 분해 실행·예산 반영 */
  canAnalyze: boolean;
  /** 분석이 있어도 예산 반영이 막히는 이유 (지원자 있음 등) */
  budgetLocked: boolean;
  /** 선정 전문가 — 계약 전 공정표 수정 */
  canEdit: boolean;
  /** 계약 뒤에는 읽기 전용 */
  frozen: boolean;
};

type Row = { id?: string; name: string; description: string; quantity: string; unit: string; estimate: string; reason: string; conditional: boolean };

/**
 * AI 공정 분해 리포트 + 예산 반영 + 전문가 수정 (A-01, A-02, docs/06 5장).
 * 같은 표가 뒤에서 계약 범위 조항·작업 단계·지급 단위가 된다.
 */
export default function ScopePanel({ projectId, analysis, budget, canAnalyze, budgetLocked, canEdit, frozen }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "analyze" | "budget" | "save">(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  const run = async (kind: "analyze" | "budget") => {
    setBusy(kind);
    setError(null);
    try {
      if (kind === "analyze") await apiSend("POST", `/api/projects/${projectId}/analyze`, {});
      else await apiSend("PATCH", `/api/projects/${projectId}/analyze`);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "처리하지 못했어요.");
    } finally {
      setBusy(null);
    }
  };

  const startEdit = () => {
    setRows(
      (analysis?.items ?? []).map((it) => ({
        id: it.id,
        name: it.name,
        description: it.description,
        quantity: it.quantity == null ? "" : String(it.quantity),
        unit: it.unit ?? "",
        estimate: String(it.estimate),
        reason: "",
        conditional: it.conditional,
      }))
    );
    setEditing(true);
  };

  const save = async () => {
    setBusy("save");
    setError(null);
    try {
      await apiSend("PATCH", `/api/projects/${projectId}/scope`, {
        items: rows.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          quantity: r.quantity === "" ? undefined : Number(r.quantity),
          unit: r.unit || undefined,
          estimate: Number(r.estimate),
          reason: r.reason || undefined,
          conditional: r.conditional,
        })),
      });
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "저장하지 못했어요.");
    } finally {
      setBusy(null);
    }
  };

  const setRow = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const editTotal = rows.reduce((s, r) => s + (Number(r.estimate) || 0), 0);

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-h3 text-ink-900">공사 범위표</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-500">
            AI가 공사 내용을 단위 공정으로 쪼갠 초안입니다. 전문가가 고치고 건물주가 동의하면 이 표가 그대로 계약서의 공사 범위
            조항, 작업 단계, 지급 단위가 됩니다.
          </p>
        </div>
        {analysis && (
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${analysis.model === "rule" ? "bg-warn-50 text-warn-700" : analysis.model === "vendor" ? "bg-ok-50 text-ok-700" : "bg-accent-50 text-accent-600"}`}>
            {analysis.model === "rule" ? "AI 분해 초안 (데모 엔진)" : analysis.model === "vendor" ? "전문가 작성" : `AI · ${analysis.model}`}
          </span>
        )}
      </div>

      {!analysis && !editing && (
        <div className="mt-5 rounded-control border border-dashed border-line-200 bg-canvas-50 p-5 text-center">
          <p className="text-sm text-ink-500">아직 범위표가 없어요.</p>
          {canAnalyze && (
            <button type="button" disabled={busy !== null} onClick={() => run("analyze")} className="btn-primary mt-3 px-5 py-2.5 text-sm">
              {busy === "analyze" ? "분해 중…" : "AI로 공정 분해하기"}
            </button>
          )}
          {canEdit && (
            <button type="button" onClick={startEdit} className="btn-secondary mt-3 px-5 py-2.5 text-sm">
              직접 범위표 만들기
            </button>
          )}
        </div>
      )}

      {analysis && !editing && (
        <>
          <ol className="mt-5 divide-y divide-line-100 rounded-control border border-line-200">
            {analysis.items.map((it) => (
              <li key={it.id} className="p-3.5">
                <button type="button" onClick={() => setOpen(open === it.id ? null : it.id)} className="flex w-full items-start justify-between gap-3 text-left">
                  <div className="min-w-0">
                    <p className="font-bold text-ink-900">
                      <span className="mr-2 text-[12px] font-semibold text-ink-400">{it.sortOrder + 1}</span>
                      {it.name}
                      {it.conditional && <span className="ml-2 rounded-full bg-warn-50 px-1.5 py-0.5 text-[10px] font-semibold text-warn-700">진단 후 확정</span>}
                      {it.editedBy && <span className="ml-1.5 rounded-full bg-ok-50 px-1.5 py-0.5 text-[10px] font-semibold text-ok-700">전문가 수정</span>}
                    </p>
                    <p className="mt-0.5 text-[13px] text-ink-500">
                      {it.description}
                      {it.quantity != null && it.unit && <span className="text-ink-400"> · {it.quantity}{it.unit}</span>}
                    </p>
                  </div>
                  <span className="shrink-0 font-bold tabular-nums text-ink-900">{won(it.estimate)}</span>
                </button>
                {open === it.id && (
                  <p className="mt-2 whitespace-pre-wrap rounded-control bg-canvas-50 px-3 py-2 text-[12.5px] leading-relaxed text-ink-700">
                    <span className="font-semibold text-ink-500">산정 근거 · </span>
                    {it.rationale}
                  </p>
                )}
              </li>
            ))}
            <li className="flex items-center justify-between bg-canvas-50 p-3.5 font-bold text-ink-900">
              <span>합계</span>
              <span className="text-[17px] tabular-nums">{won(analysis.totalEstimate)}</span>
            </li>
          </ol>

          {(analysis.assumptions.length > 0 || analysis.missingInfo.length > 0) && (
            <div className="mt-3 grid gap-2 text-[12.5px] text-ink-500 sm:grid-cols-2">
              {analysis.assumptions.length > 0 && (
                <div className="rounded-control bg-canvas-50 p-3">
                  <p className="font-semibold text-ink-700">가정</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4">{analysis.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
                </div>
              )}
              {analysis.missingInfo.length > 0 && (
                <div className="rounded-control bg-canvas-50 p-3">
                  <p className="font-semibold text-ink-700">더 알면 정확해지는 것</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4">{analysis.missingInfo.map((a) => <li key={a}>{a}</li>)}</ul>
                </div>
              )}
            </div>
          )}

          {!frozen && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {canAnalyze && (
                <>
                  <button type="button" disabled={busy !== null} onClick={() => run("analyze")} className="btn-secondary px-4 py-2 text-sm">
                    {busy === "analyze" ? "분해 중…" : "다시 분해"}
                  </button>
                  <button type="button" disabled={busy !== null || budgetLocked || budget === analysis.totalEstimate} onClick={() => run("budget")} className="btn-primary px-4 py-2 text-sm" title={budgetLocked ? "지원자가 있어 예산이 잠겨 있어요" : undefined}>
                    {budget === analysis.totalEstimate ? "예산에 반영됨" : busy === "budget" ? "반영 중…" : "합계를 예산에 반영"}
                  </button>
                  {budgetLocked && budget !== analysis.totalEstimate && <span className="text-[12px] text-ink-400">지원자가 있어 예산은 잠겨 있어요</span>}
                </>
              )}
              {canEdit && (
                <button type="button" onClick={startEdit} className="btn-primary px-4 py-2 text-sm">
                  공정표 고치기
                </button>
              )}
            </div>
          )}
          {frozen && <p className="mt-3 text-[12px] text-ink-400">계약서가 만들어져 범위는 사본으로 고정됐어요.</p>}
        </>
      )}

      {editing && (
        <div className="mt-5 space-y-3">
          <p className="rounded-control bg-ok-50 px-3 py-2 text-[13px] text-ok-700">
            행을 고치면 &ldquo;전문가 수정&rdquo; 표시와 사유가 남습니다. 건물주는 AI 원안과 고친 표를 비교해 보고 금액을 제시합니다.
          </p>
          {rows.map((r, i) => (
            <div key={r.id ?? `new-${i}`} className="rounded-control border border-line-200 p-3">
              <div className="grid gap-2 sm:grid-cols-[1fr_120px]">
                <input className={inputClass} value={r.name} onChange={(e) => setRow(i, { name: e.target.value })} placeholder="공정 이름" />
                <input type="number" step={10000} min={10000} className={inputClass} value={r.estimate} onChange={(e) => setRow(i, { estimate: e.target.value })} placeholder="금액" />
              </div>
              <input className={`${inputClass} mt-2`} value={r.description} onChange={(e) => setRow(i, { description: e.target.value })} placeholder="무엇을 어디까지 하는지" />
              <div className="mt-2 grid gap-2 sm:grid-cols-[90px_90px_1fr]">
                <input type="number" className={inputClass} value={r.quantity} onChange={(e) => setRow(i, { quantity: e.target.value })} placeholder="수량" />
                <input className={inputClass} value={r.unit} onChange={(e) => setRow(i, { unit: e.target.value })} placeholder="단위" />
                <input className={inputClass} value={r.reason} onChange={(e) => setRow(i, { reason: e.target.value })} placeholder="고친 이유 (예: 현장 확인 결과 배관 2개소)" />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-[12.5px] text-ink-500">
                  <input type="checkbox" checked={r.conditional} onChange={(e) => setRow(i, { conditional: e.target.checked })} /> 진단 후 확정
                </label>
                <button type="button" onClick={() => setRows((rs) => rs.filter((_, k) => k !== i))} className="text-[12.5px] font-semibold text-danger-600">
                  행 삭제
                </button>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setRows((rs) => [...rs, { name: "", description: "", quantity: "1", unit: "식", estimate: "", reason: "", conditional: false }])} className="btn-secondary px-4 py-2 text-sm">
            + 공정 추가
          </button>
          <div className="flex items-center justify-between rounded-control bg-canvas-50 p-3 font-bold text-ink-900">
            <span>합계</span>
            <span className="tabular-nums">{won(editTotal)}</span>
          </div>
          <ErrorText>{error}</ErrorText>
          <div className="flex gap-2">
            <button type="button" disabled={busy !== null || rows.length === 0} onClick={save} className="btn-primary px-5 py-2.5 text-sm">
              {busy === "save" ? "저장 중…" : "범위표 저장"}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="btn-secondary px-4 py-2.5 text-sm">
              취소
            </button>
          </div>
        </div>
      )}

      {!editing && <div className="mt-3"><ErrorText>{error}</ErrorText></div>}
    </section>
  );
}

export type { ScopeItemView };
