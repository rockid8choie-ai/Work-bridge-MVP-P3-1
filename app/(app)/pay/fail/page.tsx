import Link from "next/link";

/** 결제창 실패·취소 리다이렉트. 주문은 pending 으로 남아 다시 결제창을 열면 재사용된다. */
export default async function PayFailPage({ searchParams }: { searchParams: Promise<{ code?: string; message?: string }> }) {
  const { code, message } = await searchParams;
  return (
    <div className="card mx-auto max-w-md p-8 text-center">
      <h1 className="text-h3 text-ink-900">결제가 끝나지 않았어요</h1>
      <p className="mt-2 text-sm text-ink-700">{message ?? "결제창을 닫았거나 결제가 거절됐어요."}</p>
      {code && <p className="mt-1 text-[12px] text-ink-400">{code}</p>}
      <Link href="/me/projects" className="btn-primary mt-5 inline-block px-4 py-2 text-sm">내 건물 공사로 돌아가기</Link>
    </div>
  );
}
