"use client";

import Link from "next/link";
import {
  Check,
  CheckCircle2,
  CircleX,
  Copy,
  Gift,
  LoaderCircle,
  Star,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getMyBooking, type CustomerBooking } from "../../lib/api/account";
import { formatDateTime, formatToman } from "../../lib/format";
import { IranLicensePlateDisplay } from "../booking/iran-license-plate-display";
import { plateFromBooking } from "../../lib/booking-plate";

export function PaymentResultCard({
  success,
  bookingId,
  paymentId,
}: {
  success: boolean;
  bookingId?: string;
  paymentId?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [booking, setBooking] = useState<CustomerBooking | null>(null);
  const [loading, setLoading] = useState(Boolean(success && bookingId));
  useEffect(() => {
    if (!success || !bookingId) return;
    getMyBooking(bookingId)
      .then(setBooking)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [bookingId, success]);
  const coupon = booking?.completionReward?.coupon;
  const points = booking?.completionReward?.points ?? 0;
  async function copy() {
    if (!coupon) return;
    await navigator.clipboard.writeText(coupon.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="px-5 py-10 text-center">
      <div className="mx-auto max-w-sm rounded-[28px] border border-[var(--bw-border)] bg-white p-6 shadow-[var(--bw-shadow-card)]">
        {success ? (
          <CheckCircle2 size={60} className="mx-auto text-emerald-500" />
        ) : (
          <CircleX size={60} className="mx-auto text-red-500" />
        )}
        <h1 className="mt-5 text-[19px] font-black">
          {success ? "پرداخت و رزرو با موفقیت انجام شد" : "پرداخت تکمیل نشد"}
        </h1>
        <p className="mt-3 text-[11px] leading-7 text-slate-600">
          {success
            ? "رزرو شما قطعی شد و همه جزئیات در بخش رزروهای من در دسترس است."
            : "اگر مبلغی کسر شده باشد، طبق پاسخ درگاه بانکی به حساب شما بازمی‌گردد. می‌توانید دوباره تلاش کنید."}
        </p>
        {success && loading ? (
          <LoaderCircle className="mx-auto mt-6 animate-spin text-blue-600" />
        ) : null}
        {success && booking ? (
          <>
            <div className="mt-5 rounded-[18px] bg-slate-50 p-4 text-right">
              <Detail label="شماره رزرو" value={booking.code} />
              <Detail
                label="خودرو"
                value={`${booking.brandName ?? ""} ${booking.modelName}`.trim()}
              />
              <div className="border-b border-slate-200 py-3">
                <span className="mb-2 block text-[10px] text-slate-500">
                  پلاک خودرو
                </span>
                <IranLicensePlateDisplay
                  plate={plateFromBooking(booking)}
                  size="small"
                />
              </div>
              <Detail
                label="زمان مراجعه"
                value={formatDateTime(booking.startsAt)}
              />
              <Detail
                label="تحویل‌گیرنده"
                value={
                  booking.pickupMode === "DELEGATE"
                    ? (booking.pickupDelegates?.[0]?.fullName ?? "نماینده")
                    : "مالک خودرو"
                }
              />
              <Detail
                label="مبلغ پرداخت‌شده"
                value={formatToman(
                  Number(booking.gatewayAmountRial) +
                    Number(booking.walletAmountRial),
                )}
              />
            </div>
            {points > 0 || coupon ? (
              <div
                className={`mt-5 grid gap-3 ${points > 0 && coupon ? "grid-cols-2" : "grid-cols-1"}`}
              >
                {points > 0 ? (
                  <div className="rounded-[17px] border border-amber-100 bg-amber-50 p-4">
                    <Star className="mx-auto text-amber-500" />
                    <p className="mt-2 text-[12px] font-black text-amber-800">
                      {points.toLocaleString("fa-IR")} امتیاز
                    </p>
                    <p className="mt-1 text-[9px] text-amber-700">
                      پاداش این رزرو
                    </p>
                  </div>
                ) : null}
                {coupon ? (
                  <div className="rounded-[17px] border border-blue-100 bg-blue-50 p-4">
                    <Gift className="mx-auto text-blue-600" />
                    <p className="mt-2 text-[12px] font-black text-blue-800">
                      {coupon.type === "PERCENTAGE"
                        ? `${coupon.value.toLocaleString("fa-IR")}٪ تخفیف`
                        : formatToman(coupon.value)}
                    </p>
                    <p className="mt-1 text-[9px] text-blue-700">
                      برای رزرو بعدی
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
            {coupon ? (
              <button
                onClick={() => void copy()}
                className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-[15px] border border-dashed border-blue-300 bg-blue-50 text-[12px] font-black tracking-wider text-blue-700"
              >
                {copied ? <Check size={17} /> : <Copy size={17} />}
                {coupon.code} — {copied ? "کپی شد" : "کپی کد"}
              </button>
            ) : null}
            <p className="mt-4 rounded-[14px] bg-emerald-50 p-3 text-[10px] leading-6 text-emerald-700">
              کد تحویل خودرو پس از پایان خدمات و آماده‌شدن خودرو برای
              تحویل‌گیرنده ارسال می‌شود.
            </p>
            {paymentId ? (
              <p dir="ltr" className="mt-4 text-[8px] text-slate-400">
                شناسه پرداخت: {paymentId}
              </p>
            ) : null}
          </>
        ) : null}
        <div className="mt-6 grid gap-3">
          <Link
            href={success && bookingId ? `/bookings/${bookingId}` : "/bookings"}
            className="rounded-[14px] bg-blue-600 px-4 py-3 text-[11px] font-black text-white"
          >
            {success ? "مشاهده جزئیات رزرو" : "بازگشت به رزروها"}
          </Link>
          <Link
            href="/"
            className="rounded-[14px] border border-[var(--bw-border)] px-4 py-3 text-[11px] font-bold"
          >
            بازگشت به خانه
          </Link>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex border-b border-slate-200 py-2 text-[10px] last:border-0">
      <span className="text-slate-500">{label}</span>
      <b className="mr-auto max-w-[65%] text-left text-slate-700">{value}</b>
    </div>
  );
}
