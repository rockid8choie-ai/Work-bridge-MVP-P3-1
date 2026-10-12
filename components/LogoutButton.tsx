"use client";

import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/client/api";

export default function LogoutButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={async () => {
        await apiPost("/api/auth/logout", {}).catch(() => {});
        router.push("/");
        router.refresh();
      }}
      className="text-slate-400 transition-colors hover:text-slate-700"
    >
      로그아웃
    </button>
  );
}
