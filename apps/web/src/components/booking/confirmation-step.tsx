"use client";

import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
  TimerReset,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  BookingHoldApiError,
  cancelBookingHold,
  createBookingHold,
  type BookingHoldData,
} from "../../lib/api/booking-holds";
import type {
  BookingServiceSelection,
  BookingTimeSelection,
  BookingVehicleSelection,
} from "../../lib/booking-types";
import { toPersianDigits } from "../../lib/iran-plate";
import { formatPersianFullDate } from "../../lib/persian-date";
import { BookingVehicleSummary } from "./booking-vehicle-summary";

interface ConfirmationStepProps {
  vehicle: BookingVehicleSelection;
  service: BookingServiceSelection;
  time: BookingTimeSelection;
  existingHold: BookingHoldData | null;
  onHoldReady: (hold: BookingHoldData) => void;
  onBack: () => void;
  onExpired: () => void;
  onComplete: (hold: BookingHoldData) => void;
}

type HoldPhase = "creating" | "active" | "error" | "expired";

function formatToman(amountRial: number): string {
  return `${new Intl.NumberFormat("fa-IR").format(
    Math.round(amountRial / 10),
  )} تومان`;
}

function getVehicleTitle(vehicle: BookingVehicleSelection): string {
  if (vehicle.sourceMode === "CATALOG") {
    return [vehicle.brand?.nameFa, vehicle.model?.nameFa]
      .filter(Boolean)
      .join(" ");
  }

  return [vehicle.customBrand, vehicle.customModel].filter(Boolean).join(" ");
}

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);

  const seconds = totalSeconds % 60;

  return toPersianDigits(
    `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
  );
}

export function ConfirmationStep({
  vehicle,
  service,
  time,
  existingHold,
  onHoldReady,
  onBack,
  onExpired,
  onComplete,
}: ConfirmationStepProps) {
  const [hold, setHold] = useState<BookingHoldData | null>(() => existingHold);

  const [phase, setPhase] = useState<HoldPhase>(() => {
    if (!existingHold) {
      return "creating";
    }

    return existingHold.status === "ACTIVE" ? "active" : "expired";
  });

  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const [error, setError] = useState<string | null>(null);

  const [cancelling, setCancelling] = useState(false);

  const requestedRef = useRef(false);

  const expirationHandledRef = useRef(false);

  useEffect(() => {
    if (requestedRef.current) {
      return;
    }

    requestedRef.current = true;

    if (existingHold) {
      return;
    }

    createBookingHold({
      vehicleClassId: vehicle.vehicleClass.id,
      packageId: service.package.id,
      addonIds: service.addons.map((addon) => addon.id),
      startAt: time.startAt,
    })
      .then((createdHold) => {
        setHold(createdHold);
        setPhase("active");
        setError(null);

        onHoldReady(createdHold);
      })
      .catch((requestError: unknown) => {
        setPhase("error");

        if (
          requestError instanceof BookingHoldApiError &&
          requestError.status === 409
        ) {
          setError(
            "این زمان همین حالا توسط کاربر دیگری پر شده است. لطفاً یک ساعت دیگر انتخاب کنید.",
          );

          return;
        }

        setError(
          "نگهداری موقت ظرفیت انجام نشد. لطفاً دوباره زمان مراجعه را انتخاب کنید.",
        );
      });
  }, [
    existingHold,
    onHoldReady,
    service.addons,
    service.package.id,
    time.startAt,
    vehicle.vehicleClass.id,
  ]);

  useEffect(() => {
    if (!hold || phase !== "active") {
      return;
    }

    const activeHold = hold;

    expirationHandledRef.current = false;

    function updateCountdown() {
      const expiresAt = Date.parse(activeHold.expiresAt);

      const seconds = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));

      setRemainingSeconds(seconds);

      if (seconds <= 0 && !expirationHandledRef.current) {
        expirationHandledRef.current = true;

        void cancelBookingHold(activeHold.token)
          .catch(() => {
            // Backend also releases expired holds when availability is read.
          })
          .finally(() => {
            onExpired();
          });
      }
    }

    updateCountdown();

    const interval = window.setInterval(updateCountdown, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [hold, onExpired, phase]);

  async function handleBack() {
    if (cancelling) {
      return;
    }

    if (!hold || phase === "expired" || phase === "error") {
      onBack();
      return;
    }

    setCancelling(true);
    setError(null);

    try {
      await cancelBookingHold(hold.token);

      onBack();
    } catch {
      setError(
        "آزادسازی ظرفیت موقت انجام نشد. لطفاً دوباره دکمه بازگشت را بزنید.",
      );
    } finally {
      setCancelling(false);
    }
  }

  if (phase === "creating") {
    return (
      <div className="mt-5 rounded-[26px] border border-[var(--bw-border)] bg-[var(--bw-surface)] p-6 shadow-[var(--bw-shadow-card)]">
        <div className="flex min-h-[230px] flex-col items-center justify-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[var(--bw-primary-50)] text-[var(--bw-primary-600)]">
            <LoaderCircle size={26} className="animate-spin" />
          </span>

          <h2 className="mt-4 text-[13px] font-black text-slate-800">
            در حال نگهداری زمان انتخابی
          </h2>

          <p className="mt-2 max-w-[280px] text-[8px] leading-5 text-slate-400">
            ظرفیت ساعت انتخاب‌شده برای شما بررسی و به‌صورت موقت نگهداری می‌شود.
          </p>
        </div>
      </div>
    );
  }

  if (phase === "error" || !hold) {
    return (
      <div className="mt-5 rounded-[24px] border border-red-100 bg-red-50 p-5">
        <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-white text-red-500 shadow-sm">
          <AlertCircle size={20} />
        </span>

        <h2 className="mt-4 text-[13px] font-black text-red-700">
          این زمان قابل نگهداری نیست
        </h2>

        <p className="mt-2 text-[8px] leading-5 text-red-500">{error}</p>

        <button
          type="button"
          onClick={onBack}
          className="mt-4 min-h-[50px] w-full rounded-[15px] bg-white text-[9px] font-black text-red-600 shadow-sm"
        >
          بازگشت و انتخاب زمان دیگر
        </button>
      </div>
    );
  }

  if (phase === "expired") {
    return (
      <div className="mt-5 rounded-[24px] border border-amber-100 bg-amber-50 p-5">
        <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-white text-amber-600 shadow-sm">
          <TimerReset size={20} />
        </span>

        <h2 className="mt-4 text-[13px] font-black text-amber-800">
          زمان نگهداری رزرو تمام شد
        </h2>

        <p className="mt-2 text-[8px] leading-5 text-amber-700">
          برای جلوگیری از مسدود ماندن ظرفیت، زمان انتخاب‌شده پس از پایان مهلت
          آزاد شد.
        </p>

        <button
          type="button"
          onClick={onBack}
          className="mt-4 min-h-[50px] w-full rounded-[15px] bg-white text-[9px] font-black text-amber-700 shadow-sm"
        >
          انتخاب دوباره زمان
        </button>
      </div>
    );
  }

  const countdownUrgent = remainingSeconds <= 120;

  return (
    <div className="mt-5">
      <div
        className={`rounded-[20px] border p-4 ${
          countdownUrgent
            ? "border-amber-200 bg-amber-50"
            : "border-blue-100 bg-[var(--bw-primary-50)]"
        }`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-white shadow-sm ${
              countdownUrgent
                ? "text-amber-600"
                : "text-[var(--bw-primary-600)]"
            }`}
          >
            <TimerReset size={20} />
          </span>

          <div className="min-w-0 flex-1">
            <p
              className={`text-[8px] font-black ${
                countdownUrgent
                  ? "text-amber-700"
                  : "text-[var(--bw-primary-600)]"
              }`}
            >
              زمان برای شما نگه داشته شده
            </p>

            <p className="mt-1 text-[7px] leading-4 text-slate-500">
              تا پایان این مهلت، ظرفیت انتخابی موقتاً برای شما محفوظ است.
            </p>
          </div>

          <div
            dir="ltr"
            className={`shrink-0 rounded-[12px] bg-white px-3 py-2 text-[13px] font-black shadow-sm ${
              countdownUrgent ? "text-amber-600" : "text-[#0d6de0]"
            }`}
          >
            {formatCountdown(remainingSeconds)}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <BookingVehicleSummary
          vehicle={vehicle}
          vehicleTitle={getVehicleTitle(vehicle)}
          onBack={() => {
            void handleBack();
          }}
        />
      </div>

      <section className="mt-4 overflow-hidden rounded-[24px] border border-[var(--bw-border)] bg-[var(--bw-surface)] shadow-[var(--bw-shadow-soft)]">
        <div className="border-b border-[var(--bw-border)] p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[var(--bw-primary-50)] text-[var(--bw-primary-600)]">
              <Sparkles size={18} />
            </span>

            <div>
              <p className="text-[8px] text-slate-400">خدمات انتخاب‌شده</p>

              <h3 className="mt-0.5 text-[11px] font-black text-slate-800">
                {hold.package.nameFa}
              </h3>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[8px] text-slate-400">پکیج اصلی</span>

            <span className="text-[9px] font-black text-slate-700">
              {hold.package.nameFa}
            </span>
          </div>

          {service.addons.length > 0 ? (
            <div className="mt-4 border-t border-dashed border-[var(--bw-border)] pt-4">
              <p className="mb-2 text-[8px] font-bold text-slate-400">
                خدمات تکمیلی
              </p>

              <div className="space-y-2">
                {service.addons.map((addon) => (
                  <div key={addon.id} className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <Check size={10} />
                    </span>

                    <span className="text-[8px] font-bold text-slate-600">
                      {addon.nameFa}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-[7px] text-slate-400">
              خدمت تکمیلی انتخاب نشده است.
            </p>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-[15px] bg-[var(--bw-bg)] p-3">
              <p className="text-[7px] text-slate-400">مدت تقریبی</p>

              <p className="mt-1 text-[10px] font-black text-slate-700">
                {toPersianDigits(String(hold.durationMinutes))} دقیقه
              </p>
            </div>

            <div className="rounded-[15px] bg-[var(--bw-primary-50)] p-3">
              <p className="text-[7px] text-slate-400">مبلغ نهایی</p>

              <p className="mt-1 text-[10px] font-black text-[#0d6de0]">
                {formatToman(hold.totalAmountRial)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-[24px] border border-[var(--bw-border)] bg-[var(--bw-surface)] p-4 shadow-[var(--bw-shadow-soft)]">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[var(--bw-primary-50)] text-[var(--bw-primary-600)]">
            <Clock3 size={18} />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-[8px] text-slate-400">زمان مراجعه</p>

            <p className="mt-1 text-[10px] font-black leading-5 text-slate-700">
              {formatPersianFullDate(time.date)}
            </p>

            <p className="mt-1 text-[9px] font-black text-[var(--bw-primary-700)]">
              ساعت <span dir="ltr">{toPersianDigits(time.localTime)}</span>
            </p>
          </div>

          <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />
        </div>
      </section>

      {error ? (
        <div className="mt-4 flex items-start gap-2 rounded-[15px] border border-red-100 bg-red-50 p-3 text-red-600">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />

          <p className="text-[8px] leading-5">{error}</p>
        </div>
      ) : null}

      <section className="mt-4 rounded-[20px] border border-emerald-100 bg-emerald-50 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck size={19} className="mt-0.5 shrink-0 text-emerald-600" />

          <div>
            <p className="text-[9px] font-black text-emerald-700">
              قیمت و ظرفیت توسط BestWash تأیید شدند
            </p>

            <p className="mt-1 text-[7px] leading-4 text-emerald-600">
              مبلغ و مدت سرویس مجدداً توسط سرور محاسبه شده‌اند و ظرفیت این ساعت
              در حال حاضر برای شما نگه داشته شده است.
            </p>
          </div>
        </div>
      </section>

      <div className="mt-5 grid grid-cols-[auto_1fr] gap-2 rounded-[22px] border border-[var(--bw-border)] bg-[var(--bw-bg)] p-3">
        <button
          type="button"
          disabled={cancelling}
          onClick={() => {
            void handleBack();
          }}
          className="min-h-[52px] rounded-[15px] border border-[var(--bw-border)] bg-[var(--bw-surface)] px-4 text-[9px] font-black text-slate-500 disabled:opacity-60"
        >
          {cancelling ? "در حال بازگشت..." : "تغییر زمان"}
        </button>

        <button
          type="button"
          onClick={() => onComplete(hold)}
          className="flex min-h-[52px] items-center justify-center gap-2 rounded-[15px] bg-[#0d6de0] px-4 text-[10px] font-black text-white shadow-[0_10px_24px_rgba(13,109,224,0.24)] transition active:scale-[0.985]"
        >
          تأیید و ادامه
          <ArrowLeft size={16} />
        </button>
      </div>
    </div>
  );
}
