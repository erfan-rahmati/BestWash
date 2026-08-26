"use client";

import Link from "next/link";
import { Bell, CheckCheck, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import {
  ApiError,
  getNotifications,
  readAllNotifications,
  readNotification,
  type InAppNotification,
} from "../../lib/api/account";
import { formatDateTime } from "../../lib/format";
import { GuestGate } from "./guest-gate";

export function NotificationsCenter() {
  const [items, setItems] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  useEffect(() => {
    getNotifications()
      .then((data) => setItems(data.items))
      .catch((error) =>
        setUnauthorized(error instanceof ApiError && error.status === 401),
      )
      .finally(() => setLoading(false));
  }, []);
  if (loading)
    return (
      <div className="flex min-h-52 items-center justify-center">
        <LoaderCircle className="animate-spin text-blue-600" />
      </div>
    );
  if (unauthorized) return <GuestGate title="برای مشاهده اعلان‌ها وارد شوید" />;
  return (
    <div>
      <button
        onClick={() =>
          void readAllNotifications().then(() =>
            setItems((current) =>
              current.map((item) => ({
                ...item,
                readAt: item.readAt ?? new Date().toISOString(),
              })),
            ),
          )
        }
        className="mb-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-blue-50 text-[10px] font-black text-blue-700"
      >
        <CheckCheck size={17} />
        همه را خوانده‌شده علامت بزن
      </button>
      <div className="space-y-3">
        {items.length ? (
          items.map((item) => (
            <Link
              key={item.id}
              href={item.actionUrl ?? "#"}
              onClick={() => {
                if (!item.readAt) void readNotification(item.id);
              }}
              className={`block rounded-[20px] border p-4 ${item.readAt ? "border-[var(--bw-border)] bg-white" : "border-blue-200 bg-blue-50"}`}
            >
              <div className="flex gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] ${item.readAt ? "bg-slate-100 text-slate-400" : "bg-blue-600 text-white"}`}
                >
                  <Bell size={18} />
                </span>
                <div>
                  <p className="text-[12px] font-black text-slate-800">
                    {item.title ?? "اعلان BestWash"}
                  </p>
                  <p className="mt-1 text-[10px] leading-6 text-slate-600">
                    {item.body}
                  </p>
                  <p className="mt-2 text-[9px] text-slate-400">
                    {formatDateTime(item.createdAt)}
                  </p>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-[24px] border border-dashed border-blue-200 bg-blue-50 p-8 text-center">
            <Bell className="mx-auto text-blue-500" />
            <p className="mt-3 text-[11px] text-slate-600">
              هنوز اعلانی برای شما ثبت نشده است.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
