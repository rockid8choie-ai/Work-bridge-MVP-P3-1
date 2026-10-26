import Logo from "@/components/Logo";

/** 인증 화면 셸 — 캔버스 배경 + 카드 1장 (docs/11 6장). */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-canvas-50 px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>
        <p className="mt-3 text-center text-sm text-ink-500">가격이 아니라 계약 범위를 먼저 합의합니다</p>
        <div className="card mt-8 p-7 shadow-2">{children}</div>
      </div>
    </main>
  );
}
