import { redirect } from "next/navigation";
import { prisma } from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/auth";
import MarkAllReadButton from "@/components/MarkAllReadButton";

function timeAgo(d: Date) {
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const day = Math.floor(h / 24);
  if (day < 7) return `${day}일 전`;
  return d.toLocaleDateString("ko-KR");
}

/**
 * 알림 목록 (B-25, B-26).
 * 각 항목은 /api/notifications/[id]/open 으로 가는 일반 링크다 — 읽음 처리 후 목적지로 보낸다.
 */
export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const unread = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="max-w-2xl">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">알림</h1>
          <p className="mt-1 text-sm text-slate-500">미확인 {unread}건</p>
        </div>
        <MarkAllReadButton disabled={unread === 0} />
      </div>

      <ul className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-100">
        {notifications.length === 0 && (
          <li className="px-4 py-12 text-center text-sm text-slate-400">아직 알림이 없어요</li>
        )}
        {notifications.map((n) => (
          <li key={n.id}>
            <a
              href={`/api/notifications/${n.id}/open`}
              className={`flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50 ${
                n.readAt ? "" : "bg-blue-50/40"
              }`}
            >
              <span
                aria-hidden
                className={`mt-2 size-2 shrink-0 rounded-full ${n.readAt ? "bg-transparent" : "bg-blue-600"}`}
              />
              <span className="min-w-0 flex-1">
                <span className={`block text-sm ${n.readAt ? "text-slate-600" : "font-bold text-slate-900"}`}>
                  {n.title}
                </span>
                {n.body && <span className="mt-0.5 block truncate text-[13px] text-slate-500">{n.body}</span>}
              </span>
              <span className="shrink-0 text-[12px] text-slate-400">{timeAgo(n.createdAt)}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
