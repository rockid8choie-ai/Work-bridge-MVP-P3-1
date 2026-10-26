export function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <span className="mb-1.5 block text-label text-ink-700">
      {children}
      {hint && <span className="ml-1.5 text-xs font-normal text-ink-400">{hint}</span>}
    </span>
  );
}

export const inputClass =
  "input";

export function ErrorText({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return <p className="rounded-control bg-danger-50 px-3 py-2 text-sm text-danger-600">{children}</p>;
}
