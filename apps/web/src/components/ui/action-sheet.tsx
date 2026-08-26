"use client";

import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, type ReactNode } from "react";

export function ActionSheet({
  open,
  title,
  description,
  children,
  onClose,
  className = "",
}: {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose, open]);
  if (!open || typeof document === "undefined") return null;
  const root = document.getElementById("customer-overlay-root");
  if (!root) return null;
  return createPortal(
    <div
      className="pointer-events-auto absolute inset-0 bg-slate-950/25 backdrop-blur-[3px]"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`absolute inset-x-0 bottom-0 flex max-h-[88%] flex-col overflow-hidden rounded-t-[30px] border-x border-t border-[var(--bw-border)] bg-white shadow-[0_-20px_55px_rgba(16,54,94,0.22)] ${className}`}
      >
        <header className="shrink-0 border-b border-slate-100 px-5 pb-4 pt-3">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-300/80" />
          <div className="mt-4 flex items-start gap-3">
            <div>
              <h2 className="text-[16px] font-black text-slate-900">{title}</h2>
              {description ? (
                <p className="mt-1 text-[9px] leading-5 text-slate-500">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="بستن"
              className="mr-auto grid size-10 shrink-0 place-items-center rounded-[13px] border border-slate-200 bg-slate-50 text-slate-500"
            >
              <X size={18} />
            </button>
          </div>
        </header>
        <div className="bw-scrollbar-hidden min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
          {children}
        </div>
      </section>
    </div>,
    root,
  );
}
