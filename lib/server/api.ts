import { NextResponse } from "next/server";
import { ZodError } from "zod";

/** API 응답을 한 모양으로 유지한다. 클라이언트가 분기할 곳을 하나로 줄이기 위함. */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function fail(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { ok: false, code: error.code, message: error.message },
      { status: error.status }
    );
  }

  if (error instanceof ZodError) {
    const first = error.issues[0];
    return NextResponse.json(
      {
        ok: false,
        code: "VALIDATION_FAILED",
        message: first?.message ?? "입력값을 확인해 주세요",
        field: first?.path.join("."),
      },
      { status: 400 }
    );
  }

  console.error("[api] 처리되지 않은 오류:", error);
  return NextResponse.json(
    { ok: false, code: "INTERNAL_ERROR", message: "잠시 후 다시 시도해 주세요" },
    { status: 500 }
  );
}

export async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "INVALID_JSON", "요청 본문을 읽을 수 없습니다");
  }
}
