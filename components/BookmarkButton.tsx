"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/client/api";

/** 북마크 토글 (B-27) — 전문가만 보인다 */
export default function BookmarkButton({ projectId, initial }: { projectId: string; initial: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      aria-pressed={on}
      onClick={async () => {
        setBusy(true);
        try {
          const r = await apiPost<{ bookmarked: boolean }>(`/api/projects/${projectId}/bookmark`, {});
          setOn(r.bookmarked);
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
      className={`rounded-xl border px-3.5 py-2 text-sm font-bold transition-colors ${
        on ? "border-amber-300 bg-amber-50 text-amber-700" : "border-slate-200 text-slate-600 hover:border-slate-400"
      }`}
    >
      {on ? "★ 북마크됨" : "☆ 북마크"}
    </button>
  );
}
