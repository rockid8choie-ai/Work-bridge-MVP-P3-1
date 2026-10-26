"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/client/api";

/** 알림 일괄 읽음 (B-26) */
export default function MarkAllReadButton({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={async () => {
        setBusy(true);
        try {
          await apiPost("/api/notifications", { all: true });
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
      className="btn-secondary px-3.5 py-2 text-sm"
    >
      모두 읽음
    </button>
  );
}
