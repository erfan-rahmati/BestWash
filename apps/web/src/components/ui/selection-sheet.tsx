"use client";

import { Check, Search, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";

export interface SelectionSheetItem {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
}

interface SelectionSheetProps {
  open: boolean;
  title: string;
  description?: string;
  searchPlaceholder?: string;
  items: SelectionSheetItem[];
  selectedId?: string;
  loading?: boolean;
  emptyMessage?: string;
  onClose: () => void;
  onSelect: (item: SelectionSheetItem) => void;
}

export function SelectionSheet({
  open,
  title,
  description,
  searchPlaceholder = "جستجو...",
  items,
  selectedId,
  loading = false,
  emptyMessage = "موردی پیدا نشد.",
  onClose,
  onSelect,
}: SelectionSheetProps) {
  const [query, setQuery] = useState("");

  function closeSheet() {
    setQuery("");
    onClose();
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setQuery("");
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("fa");

    if (!normalizedQuery) {
      return items;
    }

    return items.filter((item) => {
      const searchable = [item.title, item.subtitle ?? "", item.meta ?? ""]
        .join(" ")
        .toLocaleLowerCase("fa");

      return searchable.includes(normalizedQuery);
    });
  }, [items, query]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  const overlayRoot = document.getElementById("customer-overlay-root");

  if (!overlayRoot) {
    return null;
  }

  const sheet = (
    <div
      className="pointer-events-auto absolute inset-0 bg-slate-950/20 backdrop-blur-[3px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closeSheet();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="absolute inset-x-0 bottom-0 flex min-h-[320px] max-h-[86%] flex-col overflow-hidden rounded-t-[30px] border-x border-t border-[var(--bw-border)] bg-[var(--bw-bg)] shadow-[0_-20px_55px_rgba(16,54,94,0.20)]"
      >
        <div className="shrink-0 border-b border-[var(--bw-border)] bg-[var(--bw-bg)] px-5 pb-4 pt-3">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-300/80" />

          <div className="mt-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-[17px] font-black text-[var(--bw-text)]">
                {title}
              </h2>

              {description ? (
                <p className="mt-1 text-[9px] leading-5 text-[var(--bw-text-secondary)]">
                  {description}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              aria-label="بستن"
              onClick={closeSheet}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border border-[var(--bw-border)] bg-[var(--bw-surface)] text-slate-500 shadow-sm transition active:scale-95"
            >
              <X size={17} />
            </button>
          </div>

          <label className="mt-4 flex min-h-[48px] items-center gap-2.5 rounded-[15px] border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 transition focus-within:border-[var(--bw-primary-300)] focus-within:ring-4 focus-within:ring-blue-100/60">
            <Search size={17} className="shrink-0 text-slate-400" />

            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              type="search"
              placeholder={searchPlaceholder}
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-[11px] text-slate-700 outline-none placeholder:text-slate-400"
            />
          </label>
        </div>

        <div className="bw-scrollbar-hidden min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-5 pb-5 pt-3 [-webkit-overflow-scrolling:touch]">
          {loading ? (
            <div className="space-y-2">
              {Array.from({
                length: 6,
              }).map((_, index) => (
                <div
                  key={index}
                  className="h-[60px] animate-pulse rounded-[16px] border border-[var(--bw-border)] bg-[var(--bw-surface)]"
                />
              ))}
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="space-y-2">
              {filteredItems.map((item) => {
                const active = item.id === selectedId;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setQuery("");
                      onSelect(item);
                    }}
                    className={`flex min-h-[60px] w-full items-center gap-3 rounded-[16px] border px-3.5 text-right transition active:scale-[0.99] ${
                      active
                        ? "border-[var(--bw-primary-300)] bg-[var(--bw-primary-50)]"
                        : "border-[var(--bw-border)] bg-[var(--bw-surface)]"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] ${
                        active
                          ? "bg-[var(--bw-primary-600)] text-white"
                          : "bg-[var(--bw-surface-soft)] text-slate-400"
                      }`}
                    >
                      {active ? (
                        <Check size={17} strokeWidth={2.7} />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-current opacity-50" />
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-black text-slate-800">
                        {item.title}
                      </span>

                      {item.subtitle ? (
                        <span className="mt-0.5 block truncate text-[8px] text-slate-400">
                          {item.subtitle}
                        </span>
                      ) : null}
                    </span>

                    {item.meta ? (
                      <span className="shrink-0 rounded-full bg-[var(--bw-primary-50)] px-2 py-1 text-[7px] font-bold text-[var(--bw-primary-600)]">
                        {item.meta}
                      </span>
                    ) : null}
                  </button>
                );
              })}

              <div aria-hidden="true" className="h-2" />
            </div>
          ) : (
            <div className="rounded-[18px] border border-dashed border-[var(--bw-border)] bg-[var(--bw-surface)] p-6 text-center">
              <Search size={22} className="mx-auto text-slate-300" />

              <p className="mt-3 text-[10px] font-bold text-slate-500">
                {emptyMessage}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );

  return createPortal(sheet, overlayRoot);
}
