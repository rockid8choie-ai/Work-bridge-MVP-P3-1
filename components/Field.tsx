export function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <span className="mb-1.5 block text-label text-ink-700">
      {children}
      {hint && <span className="ml-1.5 text-xs font-normal text-ink-400">{hint}</span>}
    </span>
  );
}

export const inputClass =
  "w-full rounded-control border border-line-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent-500 focus-visible:outline-none";

export function ErrorText({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return <p className="rounded-control bg-danger-50 px-3 py-2 text-sm text-danger-600">{children}</p>;
}
