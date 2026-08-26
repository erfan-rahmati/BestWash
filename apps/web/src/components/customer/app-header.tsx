"use client";

import Link from "next/link";
import { ArrowLeft, Bell, CheckCheck, ChevronLeft, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getNotifications,
  hasCustomerSessionHint,
  readAllNotifications,
  readNotification,
  type InAppNotification,
} from "../../lib/api/account";
import { formatDateTime } from "../../lib/format";

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  function load() {
    if (!hasCustomerSessionHint()) return;
    getNotifications()
      .then((data) => {
        setItems(data.items.slice(0, 8));
        setUnreadCount(data.unreadCount);
      })
      .catch(() => null);
  }

  useEffect(() => void load(), []);

  return (
    <>
      <header className="relative z-50 shrink-0 border-b border-[var(--bw-border)] bg-[rgba(237,243,248,0.94)] px-5 pb-3 pt-[max(14px,env(safe-area-inset-top))] backdrop-blur-2xl">
        <div className="flex min-h-[48px] items-center justify-between">
          <Link
            href="/"
            className="text-[25px] font-black tracking-[-0.045em] text-[var(--bw-primary-600)]"
          >
            BestWash
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={
                unreadCount
                  ? `${unreadCount.toLocaleString("fa-IR")} اعلان خوانده‌نشده`
                  : "اعلان‌ها"
              }
              onClick={() => {
                setOpen(true);
                load();
              }}
              className="relative flex h-10 w-10 items-center justify-center rounded-[14px] border border-[var(--bw-border)] bg-[var(--bw-surface)] text-slate-500 shadow-[var(--bw-shadow-soft)] transition active:scale-95"
            >
              <Bell size={18} strokeWidth={2} />
              {unreadCount ? (
                <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-[var(--bw-bg)] bg-blue-600 px-1 text-[8px] font-black text-white">
                  {Math.min(99, unreadCount).toLocaleString("fa-IR")}
                </span>
              ) : null}
            </button>
            {pathname !== "/" ? (
              <button
                type="button"
                aria-label="بازگشت"
                onClick={() => router.back()}
                className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-[var(--bw-border)] bg-white text-slate-500 shadow-[var(--bw-shadow-soft)] active:scale-95"
              >
                <ArrowLeft size={18} />
              </button>
            ) : null}
          </div>
        </div>
      </header>
      {open ? (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-900/35 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="اعلان‌های اخیر"
        >
          <div className="max-h-[78dvh] w-full max-w-[408px] overflow-hidden rounded-[28px] bg-white shadow-2xl">
            <div className="flex items-center border-b border-slate-100 p-5">
              <div>
                <h2 className="text-[15px] font-black text-slate-800">
                  اعلان‌های اخیر
                </h2>
                <p className="mt-1 text-[10px] text-slate-500">
                  آخرین رویدادهای حساب و رزروها
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="mr-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100"
                aria-label="بستن"
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[54dvh] overflow-y-auto p-4">
              {items.length ? (
                <div className="space-y-2">
                  {items.map((item) => (
                    <Link
                      key={item.id}
                      href={item.actionUrl ?? "/notifications"}
                      onClick={() => {
                        if (!item.readAt) void readNotification(item.id);
                        setOpen(false);
                      }}
                      className={`block rounded-[17px] border p-3 ${item.readAt ? "border-slate-100 bg-white" : "border-blue-100 bg-blue-50"}`}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={`mt-1 h-2 w-2 shrink-0 rounded-full ${item.readAt ? "bg-slate-300" : "bg-blue-600"}`}
                        />
                        <div className="min-w-0">
                          <p className="text-[11px] font-black text-slate-700">
                            {item.title ?? "اعلان BestWash"}
                          </p>
                          <p className="mt-1 text-[10px] leading-5 text-slate-500">
                            {item.body}
                          </p>
                          <p className="mt-1 text-[8px] text-slate-400">
                            {formatDateTime(item.createdAt)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="py-10 text-center text-[11px] text-slate-500">
                  هنوز اعلانی ندارید.
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-4">
              <button
                onClick={() =>
                  void readAllNotifications().then(() => {
                    setUnreadCount(0);
                    setItems((current) =>
                      current.map((item) => ({
                        ...item,
                        readAt: item.readAt ?? new Date().toISOString(),
                      })),
                    );
                  })
                }
                className="flex min-h-11 items-center justify-center gap-2 rounded-[13px] bg-slate-100 text-[10px] font-bold text-slate-600"
              >
                <CheckCheck size={16} />
                خواندن همه
              </button>
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center justify-center gap-2 rounded-[13px] bg-blue-600 text-[10px] font-black text-white"
              >
                مشاهده همه
                <ChevronLeft size={16} />
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
