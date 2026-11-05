"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiSend, ApiRequestError } from "@/lib/client/api";

/** 프로필 이미지 (B-31) — 고르면 바로 올라간다. 저장 버튼과 무관. */
export default function AvatarUpload({ name, initialUrl }: { name: string; initialUrl: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new ApiRequestError(json.code, json.message);
      setUrl(json.data.avatarUrl);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "올리지 못했어요.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await apiSend("DELETE", "/api/profile/avatar");
      setUrl(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-line-100 text-xl font-bold text-ink-500">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="size-16 object-cover" />
        ) : (
          name.slice(0, 1)
        )}
      </div>
      <div>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        <div className="flex gap-2">
          <button type="button" disabled={busy} onClick={() => input.current?.click()} className="btn-secondary px-3 py-1.5 text-[13px]">
            {busy ? "올리는 중…" : url ? "사진 바꾸기" : "사진 올리기"}
          </button>
          {url && (
            <button type="button" disabled={busy} onClick={remove} className="px-2 py-1.5 text-[13px] font-semibold text-ink-400">
              삭제
            </button>
          )}
        </div>
        <p className="mt-1 text-[11.5px] text-ink-400">JPG · PNG · WebP, 3MB 이하</p>
        {error && <p className="mt-1 text-[12px] text-danger-600">{error}</p>}
      </div>
    </div>
  );
}
