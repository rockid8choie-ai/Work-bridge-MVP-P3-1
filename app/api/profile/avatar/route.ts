import { put, del } from "@vercel/blob";
import { prisma } from "@/lib/server/db";
import { ApiError, fail, ok } from "@/lib/server/api";
import { requireUser } from "@/lib/server/guard";

export const runtime = "nodejs";

const MAX_BYTES = 3 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/**
 * 프로필 이미지 업로드 (B-31) — Vercel Blob. 접근 키는 BLOB_READ_WRITE_TOKEN 환경 변수.
 * 이전 이미지는 지우고 새 URL 을 User.avatarUrl 에 저장한다.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (!process.env.BLOB_READ_WRITE_TOKEN) throw new ApiError(503, "STORAGE_NOT_CONFIGURED", "이미지 저장소가 설정되지 않았어요");

    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) throw new ApiError(400, "NO_FILE", "이미지 파일을 골라 주세요");
    const ext = TYPES[file.type];
    if (!ext) throw new ApiError(400, "BAD_TYPE", "JPG · PNG · WebP 만 올릴 수 있어요");
    if (file.size > MAX_BYTES) throw new ApiError(400, "TOO_LARGE", "3MB 이하로 올려 주세요");

    const blob = await put(`avatars/${user.id}-${Date.now()}.${ext}`, file, { access: "public", contentType: file.type });

    const prev = user.avatarUrl;
    await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: blob.url } });
    if (prev && prev.includes(".blob.vercel-storage.com/")) await del(prev).catch(() => {});

    return ok({ avatarUrl: blob.url });
  } catch (error) {
    return fail(error);
  }
}

/** 이미지 제거 */
export async function DELETE() {
  try {
    const user = await requireUser();
    if (user.avatarUrl?.includes(".blob.vercel-storage.com/")) await del(user.avatarUrl).catch(() => {});
    await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: null } });
    return ok({ avatarUrl: null });
  } catch (error) {
    return fail(error);
  }
}
