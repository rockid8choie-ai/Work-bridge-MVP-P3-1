import "server-only";

import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/server/db";
import { ApiError } from "@/lib/server/api";
import { draftPaymentPaid, notifyMany } from "@/lib/server/notify";

/**
 * PG(토스페이먼츠) sandbox 결제 + 에스크로 선결제 (A-07, A-09).
 * 흐름: 서버가 주문(Payment pending) 생성 → 브라우저가 결제창 → successUrl 로 돌아오면 서버가 승인 API 호출.
 * 금액은 항상 서버에 저장된 값으로 승인한다 — 쿼리스트링의 amount 는 비교만 하고 믿지 않는다.
 * 키는 환경 변수. live 키는 쓰지 않는다 (키 접두사로 막는다).
 */

const TOSS_API = "https://api.tosspayments.com/v1/payments";

export function tossClientKey() {
  const k = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? "";
  if (!k) throw new ApiError(503, "PG_NOT_CONFIGURED", "결제 키가 설정되지 않았어요 (NEXT_PUBLIC_TOSS_CLIENT_KEY)");
  if (!k.startsWith("test_")) throw new ApiError(500, "PG_LIVE_KEY_FORBIDDEN", "live 키는 쓸 수 없어요. 테스트 키만 허용합니다");
  return k;
}

function tossSecretKey() {
  const k = process.env.TOSS_SECRET_KEY ?? "";
  if (!k) throw new ApiError(503, "PG_NOT_CONFIGURED", "결제 키가 설정되지 않았어요 (TOSS_SECRET_KEY)");
  if (!k.startsWith("test_")) throw new ApiError(500, "PG_LIVE_KEY_FORBIDDEN", "live 키는 쓸 수 없어요. 테스트 키만 허용합니다");
  return k;
}

/** 결제 주문 생성 — 체결된 계약의 건물주만. 미결 주문이 있으면 재사용한다 (결제창을 닫았다 다시 여는 경우). */
export async function createOrder(projectId: string, clientId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    include: { contract: { include: { payments: { orderBy: { createdAt: "desc" } } } }, client: { select: { name: true, email: true } } },
  });
  if (!project) throw new ApiError(404, "NOT_FOUND", "프로젝트를 찾을 수 없어요");
  if (project.clientId !== clientId) throw new ApiError(403, "FORBIDDEN", "건물주만 결제할 수 있어요");
  const contract = project.contract;
  if (!contract?.signedAt) throw new ApiError(409, "NOT_SEALED", "계약이 체결된 뒤에 결제할 수 있어요");
  if (project.dealStatus !== "awaiting_payment") throw new ApiError(409, "ALREADY_PAID", "이미 결제가 끝난 공사예요");

  const existing = contract.payments.find((p) => p.status === "pending");
  const payment =
    existing ??
    (await prisma.payment.create({
      data: { contractId: contract.id, pgOrderId: `wb_${randomBytes(12).toString("base64url")}`, amount: contract.agreedAmount },
    }));

  return {
    // E2E 시뮬레이션 모드에서는 결제창을 띄우지 않으므로 클라이언트 키가 없어도 주문은 만든다
    clientKey: process.env.ALLOW_PAYMENT_SIMULATION === "1" && !process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ? "simulation" : tossClientKey(),
    orderId: payment.pgOrderId,
    amount: payment.amount,
    orderName: project.title.slice(0, 100),
    customerName: project.client.name,
    customerEmail: project.client.email,
    customerKey: `wb-${clientId}`.slice(0, 50),
  };
}

/**
 * 결제 승인 (A-07 콜백 검증). successUrl 쿼리(paymentKey, orderId, amount)를 받아
 * ① 주문이 내 것인지 ② 금액이 서버 저장값과 같은지 확인 ③ 토스 승인 API 호출 ④ paid + in_progress + 양측 알림.
 */
export async function confirmPayment(input: { paymentKey: string; orderId: string; amount: number }, clientId: string) {
  const payment = await prisma.payment.findUnique({
    where: { pgOrderId: input.orderId },
    include: { contract: { include: { project: { select: { id: true, title: true, clientId: true, dealStatus: true } }, application: { select: { freelancerId: true } } } } },
  });
  if (!payment) throw new ApiError(404, "ORDER_NOT_FOUND", "주문을 찾을 수 없어요");
  if (payment.contract.project.clientId !== clientId) throw new ApiError(403, "FORBIDDEN", "내 주문만 승인할 수 있어요");
  if (payment.status === "paid") return { alreadyPaid: true, projectId: payment.contract.project.id };
  if (payment.amount !== input.amount) throw new ApiError(400, "AMOUNT_MISMATCH", "결제 금액이 주문 금액과 달라요. 결제를 취소했어요");

  const confirmed = await callConfirm(input.paymentKey, input.orderId, payment.amount);

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "paid",
        pgPaymentKey: input.paymentKey,
        method: confirmed.method,
        receiptUrl: confirmed.receiptUrl,
        paidAt: confirmed.approvedAt,
      },
    });
    await tx.project.update({ where: { id: payment.contract.project.id }, data: { dealStatus: "in_progress" } });
    await tx.milestone.updateMany({ where: { contractId: payment.contractId, status: "todo", sortOrder: 0 }, data: { status: "in_progress" } });
    const p = payment.contract.project;
    await notifyMany(tx, [
      draftPaymentPaid({ userId: p.clientId, projectId: p.id, projectTitle: p.title, amount: payment.amount }),
      draftPaymentPaid({ userId: payment.contract.application.freelancerId, projectId: p.id, projectTitle: p.title, amount: payment.amount }),
    ]);
  });

  return { alreadyPaid: false, projectId: payment.contract.project.id };
}

async function callConfirm(paymentKey: string, orderId: string, amount: number) {
  // E2E 전용 시뮬레이션 — 브라우저 결제창 없이 흐름을 끝까지 검사하기 위해. 운영에는 이 변수를 두지 않는다.
  if (process.env.ALLOW_PAYMENT_SIMULATION === "1" && paymentKey.startsWith("simulated_")) {
    return { method: "시뮬레이션", receiptUrl: null, approvedAt: new Date() };
  }

  const auth = Buffer.from(`${tossSecretKey()}:`).toString("base64");
  const res = await fetch(`${TOSS_API}/confirm`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({ paymentKey, orderId, amount }),
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json().catch(() => ({}))) as {
    code?: string;
    message?: string;
    status?: string;
    method?: string;
    approvedAt?: string;
    receipt?: { url?: string };
  };
  if (!res.ok || json.status !== "DONE") {
    throw new ApiError(402, `PG_${json.code ?? "CONFIRM_FAILED"}`, json.message ?? "결제 승인에 실패했어요");
  }
  return {
    method: json.method ?? null,
    receiptUrl: json.receipt?.url ?? null,
    approvedAt: json.approvedAt ? new Date(json.approvedAt) : new Date(),
  };
}

/** 결제 내역 (A-08) — 건물주는 낸 돈, 전문가는 받을 돈 기준으로 같은 표를 본다 */
export async function listPayments(userId: string, role: "client" | "freelancer") {
  return prisma.payment.findMany({
    where:
      role === "client"
        ? { contract: { project: { clientId: userId } } }
        : { contract: { application: { freelancerId: userId } } },
    orderBy: { createdAt: "desc" },
    include: {
      contract: {
        select: {
          agreedAmount: true,
          project: { select: { id: true, title: true, dealStatus: true, client: { select: { name: true } } } },
          application: { select: { freelancer: { select: { name: true } } } },
          milestones: { select: { status: true, amount: true, fee: true, net: true, title: true, approvedAt: true }, orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });
}
