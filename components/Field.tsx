export function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <span className="mb-1.5 block text-sm font-semibold text-slate-700">
      {children}
      {hint && <span className="ml-1.5 text-xs font-normal text-slate-400">{hint}</span>}
    </span>
  );
}

export const inputClass =
  "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-blue-600";

export function ErrorText({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{children}</p>;
}
