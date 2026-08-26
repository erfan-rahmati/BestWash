"use client";

import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ToastKind } from "../../lib/toast";

type ToastItem = { id: number; message: string; kind: ToastKind };

export function ToastProvider() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const sequence = useRef(0);
  const recentMessages = useRef(new Map<string, number>());

  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (
        event as CustomEvent<{ message: string; kind: ToastKind }>
      ).detail;
      if (!detail?.message) return;
      const timestamp = Date.now();
      for (const [key, seenAt] of recentMessages.current) {
        if (timestamp - seenAt > 10_000) recentMessages.current.delete(key);
      }
      const messageKey = `${detail.kind}:${detail.message}`;
      const previousTimestamp = recentMessages.current.get(messageKey) ?? 0;
      if (timestamp - previousTimestamp < 2500) return;
      recentMessages.current.set(messageKey, timestamp);
      const id = ++sequence.current;
      setItems((current) => [...current.slice(-2), { id, ...detail }]);
      window.setTimeout(
        () => setItems((current) => current.filter((item) => item.id !== id)),
        3600,
      );
    };
    window.addEventListener("bestwash:toast", listener);
    return () => window.removeEventListener("bestwash:toast", listener);
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-x-3 top-[max(14px,env(safe-area-inset-top))] z-[1000] mx-auto flex max-w-[410px] flex-col gap-2"
      aria-live="polite"
    >
      {items.map((item) => {
        const style =
          item.kind === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : item.kind === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-blue-200 bg-blue-50 text-blue-800";
        const Icon =
          item.kind === "success"
            ? CheckCircle2
            : item.kind === "error"
              ? XCircle
              : Info;
        return (
          <div
            key={item.id}
            role={item.kind === "error" ? "alert" : "status"}
            className={`pointer-events-auto flex items-center gap-3 rounded-[16px] border px-4 py-3 text-[11px] font-bold shadow-xl backdrop-blur ${style}`}
          >
            <Icon size={18} className="shrink-0" />
            <span className="leading-5">{item.message}</span>
            <button
              className="mr-auto rounded-full p-1"
              aria-label="بستن پیام"
              onClick={() =>
                setItems((current) =>
                  current.filter((entry) => entry.id !== item.id),
                )
              }
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
