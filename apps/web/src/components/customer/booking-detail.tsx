"use client";

import {
  CalendarDays,
  CarFront,
  KeyRound,
  LoaderCircle,
  Phone,
  UserRound,
  ReceiptText,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  cancelBooking,
  getMyBooking,
  getPickupCode,
  updatePickupDelegate,
  type CustomerBooking,
} from "../../lib/api/account";
import {
  bookingStatusClasses,
  bookingStatusFa,
  formatDateTime,
  formatToman,
} from "../../lib/format";
import { GuestGate } from "./guest-gate";
import { IranLicensePlateDisplay } from "../booking/iran-license-plate-display";
import { plateFromBooking } from "../../lib/booking-plate";
import { ActionSheet } from "../ui/action-sheet";

export function BookingDetail({ id }: { id: string }) {
  const [booking, setBooking] = useState<CustomerBooking | null>(null);
  const [pickupCode, setPickupCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [delegateMode, setDelegateMode] = useState(false);
  const [delegateName, setDelegateName] = useState("");
  const [delegateMobile, setDelegateMobile] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const load = useCallback(() => {
    getMyBooking(id)
      .then((value) => {
        setBooking(value);
        setDelegateMode(value.pickupMode === "DELEGATE");
        const delegate = value.pickupDelegates?.[0];
        setDelegateName(delegate?.fullName ?? "");
        setDelegateMobile(delegate?.mobile ?? "");
        if (value.status === "READY_FOR_PICKUP")
          void getPickupCode(id).then((result) => setPickupCode(result.code));
      })
      .catch((requestError) => {
        if (requestError instanceof ApiError && requestError.status === 401)
          setUnauthorized(true);
        else
          setError(
            requestError instanceof Error
              ? requestError.message
              : "دریافت رزرو ناموفق بود.",
          );
      });
  }, [id]);
  useEffect(() => void load(), [load]);

  async function submitCancellation() {
    setSaving(true);
    setError(null);
    try {
      const result = await cancelBooking(id, reason);
      setCancelling(false);
      setNotice(
        result.refundAmountRial > 0
          ? `رزرو لغو و ${formatToman(result.refundAmountRial)} به کیف پول شما بازگردانده شد.`
          : "رزرو با موفقیت لغو شد.",
      );
      load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "لغو رزرو انجام نشد.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function saveDelegate() {
    setSaving(true);
    setError(null);
    try {
      await updatePickupDelegate(
        id,
        delegateMode
          ? {
              pickupMode: "DELEGATE",
              fullName: delegateName,
              mobile: delegateMobile,
            }
          : { pickupMode: "OWNER" },
      );
      setNotice(
        delegateMode
          ? "تحویل‌گیرنده ذخیره شد."
          : "تحویل خودرو به مالک تغییر کرد.",
      );
      load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "ذخیره تحویل‌گیرنده انجام نشد.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (unauthorized)
    return <GuestGate title="برای مشاهده جزئیات رزرو وارد شوید" />;
  if (error && !booking)
    return (
      <div className="rounded-[20px] bg-red-50 p-5 text-[11px] leading-6 text-red-600">
        {error}
      </div>
    );
  if (!booking)
    return (
      <div className="flex min-h-60 items-center justify-center">
        <LoaderCircle className="animate-spin text-blue-600" />
      </div>
    );
  const history = (booking.statusHistory ?? []) as Array<
    Record<string, unknown>
  >;
  const addons = (booking.addons ?? []) as Array<Record<string, unknown>>;
  const invoice = booking.invoice as
    | undefined
    | {
        id: string;
        number: string;
        subtotalRial: number;
        discountRial: number;
        walletRial: number;
        gatewayRial: number;
        totalRial: number;
        issuedAt: string;
      };
  const plate = plateFromBooking(booking);
  return (
    <div className="space-y-4">
      {notice ? (
        <div
          role="status"
          className="rounded-[16px] bg-emerald-50 p-4 text-[11px] leading-6 text-emerald-700"
        >
          {notice}
        </div>
      ) : null}
      {error ? (
        <div
          role="alert"
          className="rounded-[16px] bg-red-50 p-4 text-[11px] leading-6 text-red-600"
        >
          {error}
        </div>
      ) : null}
      <div className="rounded-[24px] border border-[var(--bw-border)] bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[15px] font-black text-slate-800">
              {booking.packageNameFa}
            </p>
            <p dir="ltr" className="mt-1 text-left text-[10px] text-slate-500">
              کد پیگیری: {booking.code}
            </p>
          </div>
          <span
            className={`rounded-full border px-3 py-1.5 text-[9px] font-black ${bookingStatusClasses(booking.status)}`}
          >
            {bookingStatusFa[booking.status] ?? booking.status}
          </span>
        </div>
        <div className="mt-5 space-y-3 border-t border-dashed border-slate-200 pt-4">
          <Row
            icon={CalendarDays}
            label="زمان مراجعه"
            value={formatDateTime(booking.startsAt)}
          />
          <Row
            icon={CalendarDays}
            label="زمان ثبت رزرو"
            value={formatDateTime(booking.createdAt)}
          />
          <Row
            icon={CarFront}
            label="خودرو"
            value={`${booking.brandName ?? ""} ${booking.modelName}، ${booking.color}`.trim()}
          />
          <div className="pt-2">
            <p className="mb-2 text-[10px] font-bold text-slate-500">
              پلاک خودرو
            </p>
            <IranLicensePlateDisplay plate={plate} size="large" />
          </div>
        </div>
      </div>
      <div className="rounded-[24px] border border-[var(--bw-border)] bg-white p-5">
        <h2 className="text-[13px] font-black text-slate-800">
          هزینه و پرداخت
        </h2>
        <div className="mt-4 space-y-2 text-[11px]">
          <Price label="مبلغ خدمات" value={booking.totalAmountRial} />
          <Price label="تخفیف" value={-Number(booking.discountAmountRial)} />
          <Price label="پرداخت از کیف پول" value={booking.walletAmountRial} />
          <Price label="پرداخت درگاه" value={booking.gatewayAmountRial} bold />
        </div>
        {addons.length ? (
          <div className="mt-4 border-t border-slate-100 pt-3">
            <p className="text-[10px] font-bold text-slate-600">خدمات افزوده</p>
            {addons.map((item) => (
              <p
                key={String(item.id)}
                className="mt-2 text-[10px] text-slate-500"
              >
                • {String(item.addonNameFa)}
              </p>
            ))}
          </div>
        ) : null}
        {invoice ? (
          <button
            type="button"
            onClick={() => setInvoiceOpen(true)}
            className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-blue-200 bg-blue-50 text-[10px] font-black text-blue-700"
          >
            <ReceiptText size={17} />
            مشاهده فاکتور رسمی رزرو
          </button>
        ) : null}
      </div>
      {pickupCode ? (
        <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5 text-center">
          <KeyRound className="mx-auto text-emerald-600" />
          <p className="mt-2 text-[10px] font-bold text-emerald-700">
            کد تحویل خودرو
          </p>
          <p
            dir="ltr"
            className="mt-2 text-[28px] font-black tracking-[0.35em] text-emerald-800"
          >
            {pickupCode}
          </p>
          <p className="mt-3 text-[10px] leading-5 text-emerald-700">
            این کد محرمانه است؛ فقط هنگام تحویل خودرو به مسئول مجموعه ارائه
            کنید.
          </p>
        </div>
      ) : null}
      <ActionSheet
        open={invoiceOpen && Boolean(invoice)}
        title="فاکتور رسمی BestWash"
        description="نسخه قابل چاپ فاکتور این رزرو"
        onClose={() => setInvoiceOpen(false)}
      >
        {invoice ? (
          <article
            id="bestwash-print-invoice"
            className="rounded-[22px] border border-slate-200 bg-white p-5"
          >
            <div className="flex items-start justify-between gap-4 border-b-2 border-slate-900 pb-4">
              <div>
                <p className="text-[18px] font-black text-slate-900">
                  BestWash
                </p>
                <p className="mt-1 text-[9px] text-slate-500">
                  فاکتور رسمی خدمات کارواش
                </p>
              </div>
              <div className="text-left">
                <p dir="ltr" className="text-[10px] font-black text-slate-800">
                  {invoice.number}
                </p>
                <p className="mt-1 text-[8px] text-slate-400">
                  {formatDateTime(invoice.issuedAt)}
                </p>
              </div>
            </div>
            <div className="my-4 grid grid-cols-2 gap-3 rounded-[14px] bg-slate-50 p-3 text-[9px]">
              <div>
                <span className="text-slate-400">کد رزرو</span>
                <b dir="ltr" className="mt-1 block">
                  {booking.code}
                </b>
              </div>
              <div>
                <span className="text-slate-400">خدمت</span>
                <b className="mt-1 block">{booking.packageNameFa}</b>
              </div>
              <div>
                <span className="text-slate-400">زمان مراجعه</span>
                <b className="mt-1 block">{formatDateTime(booking.startsAt)}</b>
              </div>
              <div>
                <span className="text-slate-400">خودرو</span>
                <b className="mt-1 block">
                  {booking.brandName} {booking.modelName}
                </b>
              </div>
            </div>
            <div className="space-y-3 border-y border-dashed border-slate-200 py-4">
              <Price label="مبلغ خدمات" value={invoice.subtotalRial} />
              <Price label="تخفیف" value={-invoice.discountRial} />
              <Price label="پرداخت از کیف پول" value={invoice.walletRial} />
              <Price label="پرداخت درگاه" value={invoice.gatewayRial} />
              <Price label="جمع نهایی" value={invoice.totalRial} bold />
            </div>
            <p className="mt-4 text-center text-[8px] leading-5 text-slate-400">
              این فاکتور به‌صورت الکترونیکی توسط سامانه BestWash صادر شده است.
            </p>
            <button
              onClick={() => window.print()}
              className="invoice-screen-only mt-4 min-h-11 w-full rounded-[14px] bg-blue-600 text-[10px] font-black text-white"
            >
              چاپ فاکتور
            </button>
          </article>
        ) : null}
      </ActionSheet>
      {!pickupCode &&
      !["COMPLETED", "CANCELLED", "NO_SHOW", "DELIVERED"].includes(
        booking.status,
      ) ? (
        <div className="rounded-[20px] border border-blue-100 bg-blue-50 p-4 text-[10px] leading-6 text-slate-600">
          <b className="text-blue-700">زمان دریافت کد تحویل:</b> پس از پایان
          خدمات و آماده‌شدن خودرو، کد شش‌رقمی برای تحویل‌گیرنده پیامک می‌شود و
          همین‌جا نیز قابل مشاهده خواهد بود.
        </div>
      ) : null}
      {!["COMPLETED", "CANCELLED", "NO_SHOW", "DELIVERED"].includes(
        booking.status,
      ) ? (
        <div className="rounded-[24px] border border-[var(--bw-border)] bg-white p-5">
          <div className="flex items-center gap-3">
            <UserRound className="text-blue-600" />
            <div>
              <h2 className="text-[13px] font-black">تحویل‌گیرنده خودرو</h2>
              <p className="mt-1 text-[10px] text-slate-500">
                مالک یا نماینده مورد اعتماد را مشخص کنید.
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 rounded-[14px] bg-slate-50 p-1">
            <button
              onClick={() => setDelegateMode(false)}
              className={`min-h-10 rounded-[11px] text-[10px] font-bold ${!delegateMode ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}
            >
              مالک خودرو
            </button>
            <button
              onClick={() => setDelegateMode(true)}
              className={`min-h-10 rounded-[11px] text-[10px] font-bold ${delegateMode ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}
            >
              نماینده
            </button>
          </div>
          {delegateMode ? (
            <div className="mt-4 space-y-3">
              <input
                value={delegateName}
                onChange={(event) => setDelegateName(event.target.value)}
                placeholder="نام و نام خانوادگی نماینده"
                className="min-h-12 w-full rounded-[14px] border border-[var(--bw-border)] px-3 text-[11px] outline-none"
              />
              <div className="flex items-center rounded-[14px] border border-[var(--bw-border)] px-3">
                <Phone size={16} className="text-slate-400" />
                <input
                  dir="ltr"
                  value={delegateMobile}
                  onChange={(event) => setDelegateMobile(event.target.value)}
                  placeholder="09123456789"
                  className="min-h-12 w-full px-3 text-left text-[11px] outline-none"
                />
              </div>
            </div>
          ) : null}
          <button
            disabled={
              saving ||
              (delegateMode && (!delegateName.trim() || !delegateMobile.trim()))
            }
            onClick={() => void saveDelegate()}
            className="mt-4 min-h-11 w-full rounded-[14px] bg-blue-50 text-[10px] font-black text-blue-700 disabled:opacity-50"
          >
            ذخیره تحویل‌گیرنده
          </button>
        </div>
      ) : null}
      <div className="rounded-[24px] border border-[var(--bw-border)] bg-white p-5">
        <p className="text-[13px] font-black text-slate-700">تاریخچه وضعیت</p>
        <div className="mt-4 space-y-3">
          {history.map((item) => (
            <div
              key={String(item.id)}
              className="flex items-center gap-3 text-[10px] text-slate-500"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              <span className="font-bold text-slate-700">
                {bookingStatusFa[String(item.toStatus)] ??
                  String(item.toStatus)}
              </span>
              <span className="mr-auto">{formatDateTime(item.createdAt)}</span>
            </div>
          ))}
        </div>
      </div>
      {booking.status === "CONFIRMED" ? (
        <div className="rounded-[22px] border border-red-100 bg-red-50 p-5">
          {cancelling ? (
            <>
              <h2 className="text-[12px] font-black text-red-700">
                لغو این رزرو؟
              </h2>
              <p className="mt-2 text-[10px] leading-6 text-red-600">
                در صورت پرداخت، مبلغ بلافاصله به اعتبار غیرقابل برداشت کیف پول
                بازمی‌گردد. مهلت لغو از تنظیمات مجموعه محاسبه می‌شود.
              </p>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="دلیل لغو (اختیاری)"
                rows={3}
                className="mt-3 w-full resize-none rounded-[13px] border border-red-100 bg-white p-3 text-[10px] outline-none"
              />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  disabled={saving}
                  onClick={() => void submitCancellation()}
                  className="min-h-11 rounded-[13px] bg-red-600 text-[10px] font-black text-white"
                >
                  تأیید لغو
                </button>
                <button
                  onClick={() => setCancelling(false)}
                  className="min-h-11 rounded-[13px] bg-white text-[10px] font-bold text-slate-600"
                >
                  انصراف
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={() => setCancelling(true)}
              className="flex min-h-11 w-full items-center justify-center gap-2 text-[10px] font-black text-red-600"
            >
              <XCircle size={17} />
              لغو رزرو
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={16} className="mt-0.5 text-blue-500" />
      <div>
        <p className="text-[9px] text-slate-400">{label}</p>
        <p className="mt-1 text-[11px] font-bold text-slate-700">{value}</p>
      </div>
    </div>
  );
}
function Price({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: number;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex items-center ${bold ? "border-t border-dashed border-slate-200 pt-3 font-black text-slate-800" : "text-slate-600"}`}
    >
      <span>{label}</span>
      <span className="mr-auto">
        {value < 0 ? `− ${formatToman(Math.abs(value))}` : formatToman(value)}
      </span>
    </div>
  );
}
