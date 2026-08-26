"use client";

import Link from "next/link";
import { ArrowLeft, CalendarCheck, Clock3, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import {
  getActiveBooking,
  hasCustomerSessionHint,
  type CustomerBooking,
} from "../../lib/api/account";
import {
  bookingStatusClasses,
  bookingStatusFa,
  formatDateTime,
} from "../../lib/format";
import { SectionHeader } from "../ui/section-header";
import { IranLicensePlateDisplay } from "../booking/iran-license-plate-display";
import { plateFromBooking } from "../../lib/booking-plate";

export function ActiveBooking() {
  const [booking, setBooking] = useState<CustomerBooking | null | undefined>(
    undefined,
  );
  useEffect(() => {
    let isActive = true;

    if (!hasCustomerSessionHint()) {
      queueMicrotask(() => {
        if (isActive) setBooking(null);
      });
      return () => {
        isActive = false;
      };
    }

    getActiveBooking()
      .then((result) => {
        if (isActive) setBooking(result);
      })
      .catch(() => {
        if (isActive) setBooking(null);
      });

    return () => {
      isActive = false;
    };
  }, []);
  return (
    <section className="px-5 pt-7">
      <SectionHeader title="رزرو بعدی" description="آخرین وضعیت رزرو شما" />
      <div className="relative mt-4 overflow-hidden rounded-[26px] border border-[var(--bw-border)] bg-white p-5 shadow-[var(--bw-shadow-card)]">
        <div className="absolute -left-16 -top-16 h-40 w-40 rounded-full bg-blue-100/60 blur-3xl" />
        {booking === undefined ? (
          <div className="flex min-h-28 items-center justify-center">
            <LoaderCircle className="animate-spin text-blue-600" />
          </div>
        ) : booking ? (
          <>
            <div className="relative flex items-start gap-3.5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-blue-600 text-white">
                <CalendarCheck size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-black text-slate-800">
                    {booking.packageNameFa}
                  </p>
                  <span
                    className={`rounded-full border px-2 py-1 text-[9px] font-black ${bookingStatusClasses(booking.status)}`}
                  >
                    {bookingStatusFa[booking.status] ?? booking.status}
                  </span>
                </div>
                <p className="mt-2 text-[10px] text-slate-500">
                  {booking.modelName} · {booking.color}
                </p>
                <div className="mt-2">
                  <IranLicensePlateDisplay
                    plate={plateFromBooking(booking)}
                    size="small"
                  />
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-[10px] font-semibold text-blue-700">
                  <Clock3 size={14} />
                  {formatDateTime(booking.startsAt)}
                </div>
              </div>
            </div>
            <div className="relative mt-4 border-t border-dashed border-blue-100 pt-3">
              <Link
                href={`/bookings/${booking.id}`}
                className="flex min-h-11 items-center justify-between rounded-[14px] bg-blue-50 px-3.5 text-[11px] font-extrabold text-blue-700"
              >
                مشاهده و پیگیری رزرو
                <ArrowLeft size={16} />
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="relative flex items-start gap-3.5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-blue-50 text-blue-600">
                <CalendarCheck size={22} />
              </span>
              <div>
                <p className="text-[13px] font-black text-slate-800">
                  هنوز رزرو فعالی ندارید
                </p>
                <p className="mt-1 text-[10px] leading-5 text-slate-500">
                  اولین رزرو کمتر از یک دقیقه زمان می‌برد.
                </p>
              </div>
            </div>
            <div className="relative mt-4 border-t border-dashed border-blue-100 pt-3">
              <Link
                href="/booking"
                className="flex min-h-11 items-center justify-between rounded-[14px] bg-blue-50 px-3.5 text-[11px] font-extrabold text-blue-700"
              >
                ثبت اولین رزرو
                <ArrowLeft size={16} />
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
