import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="block text-center">
          <span className="text-h2 text-ink-900">
            Work<span className="text-accent-600">Bridge</span>
          </span>
        </Link>
        <p className="mt-2 text-center text-sm text-ink-500">
          가격이 아니라 범위를 먼저 합의합니다
        </p>
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}
