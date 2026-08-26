import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="relative overflow-hidden rounded-[26px] border border-[var(--bw-border)] bg-[var(--bw-surface)] px-5 py-8 text-center shadow-[var(--bw-shadow-soft)]">
      <div className="absolute -left-12 -top-12 h-32 w-32 rounded-full bg-blue-100/40 blur-3xl" />

      <span className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] border border-blue-100 bg-[var(--bw-primary-50)] text-[var(--bw-primary-600)]">
        <Icon size={28} strokeWidth={1.8} />
      </span>

      <h2 className="relative mt-5 text-[14px] font-black text-slate-800">
        {title}
      </h2>

      <p className="relative mx-auto mt-2 max-w-[260px] text-[9px] leading-5 text-slate-400">
        {description}
      </p>

      {action ? <div className="relative mt-5">{action}</div> : null}
    </div>
  );
}
