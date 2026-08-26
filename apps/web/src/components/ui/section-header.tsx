import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  description?: string;
  href?: string;
  actionLabel?: string;
}

export function SectionHeader({
  title,
  description,
  href,
  actionLabel = "مشاهده همه",
}: SectionHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <h2 className="text-[16px] font-black tracking-[-0.01em] text-[var(--bw-text)]">
          {title}
        </h2>

        {description ? (
          <p className="mt-1 text-[10px] leading-5 text-[var(--bw-text-muted)]">
            {description}
          </p>
        ) : null}
      </div>

      {href ? (
        <Link
          href={href}
          className="flex min-h-9 shrink-0 items-center gap-0.5 rounded-xl px-2 text-[10px] font-bold text-[var(--bw-primary-600)] transition hover:bg-[var(--bw-primary-50)]"
        >
          {actionLabel}
          <ChevronLeft size={14} />
        </Link>
      ) : null}
    </div>
  );
}
