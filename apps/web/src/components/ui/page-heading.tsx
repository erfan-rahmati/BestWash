import type { ReactNode } from "react";

interface PageHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: PageHeadingProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[9px] font-extrabold text-[var(--bw-primary-600)]">
            {eyebrow}
          </p>
        ) : null}

        <h1 className="mt-1 text-[22px] font-black tracking-[-0.025em] text-[var(--bw-text)]">
          {title}
        </h1>

        {description ? (
          <p className="mt-2 max-w-[310px] text-[10px] leading-5 text-[var(--bw-text-secondary)]">
            {description}
          </p>
        ) : null}
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
