import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "WorkBridge — 건물 유지보수 외주 매칭",
    template: "%s · WorkBridge",
  },
  description:
    "가격을 먼저 합의하지 않습니다. 범위를 먼저 합의합니다. 건물주와 유지보수 전문가를 연결하는 외주 매칭 플랫폼.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-paper text-ink-900">{children}</body>
    </html>
  );
}
