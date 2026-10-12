"use client";

/** 서버 응답은 { ok, data } 또는 { ok, code, message } 한 모양이다 (lib/server/api.ts). */

export class ApiRequestError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly field?: string
  ) {
    super(message);
  }
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => null);

  if (!res.ok || !json?.ok) {
    throw new ApiRequestError(
      json?.code ?? "NETWORK_ERROR",
      json?.message ?? "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.",
      json?.field
    );
  }

  return json.data as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: "no-store" });
  const json = await res.json().catch(() => null);

  if (!res.ok || !json?.ok) {
    throw new ApiRequestError(
      json?.code ?? "NETWORK_ERROR",
      json?.message ?? "불러오지 못했어요."
    );
  }

  return json.data as T;
}
