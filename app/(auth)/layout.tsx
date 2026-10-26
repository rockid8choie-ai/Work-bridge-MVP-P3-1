import Logo from "@/components/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>
        <p className="mt-2 text-center text-sm text-ink-500">
          가격이 아니라 계약 범위를 먼저 합의합니다
        </p>
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}
