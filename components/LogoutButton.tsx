"use client";

import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/client/api";

export default function LogoutButton({
  className = "text-ink-400 hover:text-ink-700",
}: {
  className?: string;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={async () => {
        await apiPost("/api/auth/logout", {}).catch(() => {});
        router.push("/");
        router.refresh();
      }}
      className={`transition-colors ${className}`}
    >
      로그아웃
    </button>
  );
}
