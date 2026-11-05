"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiSend, ApiRequestError } from "@/lib/client/api";

export default function PaySuccessPage() {
  return (
    <Suspense fallback={null}>
      <Confirm />
    </Suspense>
  );
}

/**
 * 결제창 성공 리다이렉트 (A-07). 쿼리의 paymentKey·orderId·amount 를 서버로 보내 승인한다.
 * 서버가 저장된 금액과 대조하고 토스 승인 API 를 부른 뒤에야 "결제 완료"가 된다.
 */
function Confirm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const paymentKey = params.get("paymentKey");
    const orderId = params.get("orderId");
    const amount = params.get("amount");
    if (!paymentKey || !orderId || !amount) {
      Promise.resolve().then(() => setError("결제 정보가 없어요. 결제창에서 다시 시도해 주세요."));
      return;
    }
    apiSend<{ projectId: string }>("POST", "/api/payments/confirm", { paymentKey, orderId, amount: Number(amount) })
      .then((r) => {
        router.replace(`/projects/${r.projectId}/deal`);
        router.refresh();
      })
      .catch((e) => setError(e instanceof ApiRequestError ? e.message : "결제 승인에 실패했어요."));
  }, [params, router]);

  return (
    <div className="card mx-auto max-w-md p-8 text-center">
      {error ? (
        <>
          <h1 className="text-h3 text-danger-600">결제를 승인하지 못했어요</h1>
          <p className="mt-2 text-sm text-ink-700">{error}</p>
          <Link href="/me/projects" className="btn-secondary mt-5 inline-block px-4 py-2 text-sm">내 건물 공사로</Link>
        </>
      ) : (
        <>
          <h1 className="text-h3 text-ink-900">결제를 확인하는 중…</h1>
          <p className="mt-2 text-sm text-ink-500">금액을 대조하고 결제사에 승인을 요청하고 있어요.</p>
        </>
      )}
    </div>
  );
}
