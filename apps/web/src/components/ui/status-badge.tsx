import type { ReactNode } from "react";

interface StatusBadgeProps {
  children: ReactNode;
  tone?: "success" | "blue" | "neutral";
}

export function StatusBadge({ children, tone = "blue" }: StatusBadgeProps) {
  const styles = {
    success: "border-emerald-100 bg-emerald-50 text-emerald-700",
    blue: "border-blue-100 bg-blue-50 text-[var(--bw-primary-700)]",
    neutral: "border-slate-200 bg-white text-slate-500",
  };

  return (
    <span
      className={`inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 text-[10px] font-bold ${styles[tone]}`}
    >
      {children}
    </span>
  );
}
