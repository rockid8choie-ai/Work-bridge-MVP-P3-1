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

async function unwrap<T>(res: Response, fallback: string): Promise<T> {
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) {
    throw new ApiRequestError(json?.code ?? "NETWORK_ERROR", json?.message ?? fallback, json?.field);
  }
  return json.data as T;
}

export async function apiSend<T>(
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return unwrap<T>(res, "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.");
}

export function apiPost<T>(path: string, body: unknown) {
  return apiSend<T>("POST", path, body);
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: "no-store" });
  return unwrap<T>(res, "불러오지 못했어요.");
}
