import type { HTMLAttributes, ReactNode } from "react";

interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Surface({ children, className = "", ...props }: SurfaceProps) {
  return (
    <div
      className={`rounded-[22px] border border-[var(--bw-border)] bg-white shadow-[var(--bw-shadow-soft)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
