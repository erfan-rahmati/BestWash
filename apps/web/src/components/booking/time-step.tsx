"use client";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  LoaderCircle,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  getAvailabilityDays,
  getAvailabilitySlots,
  type AvailabilityDay,
  type AvailabilitySlot,
} from "../../lib/api/availability";
import type {
  BookingServiceSelection,
  BookingTimeSelection,
} from "../../lib/booking-types";
import { toPersianDigits } from "../../lib/iran-plate";

interface TimeStepProps {
  service: BookingServiceSelection;
  onBack: () => void;
  onComplete: (value: BookingTimeSelection) => void;
}

interface PersianDateInfo {
  weekday: string;
  day: string;
  month: string;
  year: string;
  full: string;
}

const weekdayFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  weekday: "short",
  timeZone: "UTC",
});

const dayFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  day: "numeric",
  timeZone: "UTC",
});

const monthFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  month: "long",
  timeZone: "UTC",
});

const yearFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "numeric",
  timeZone: "UTC",
});

const fullDateFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function isoDateToSafeDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function formatPersianDate(value: string): PersianDateInfo {
  const date = isoDateToSafeDate(value);

  return {
    weekday: weekdayFormatter.format(date),
    day: dayFormatter.format(date),
    month: monthFormatter.format(date),
    year: yearFormatter.format(date),
    full: fullDateFormatter.format(date),
  };
}

function formatToman(amountRial: number): string {
  return `${new Intl.NumberFormat("fa-IR").format(
    Math.round(amountRial / 10),
  )} تومان`;
}

function getDayStateLabel(day: AvailabilityDay): string | null {
  if (!day.isOpen) {
    return day.reason?.trim() || "تعطیل";
  }

  if (day.availableSlots <= 0) {
    return "تکمیل ظرفیت";
  }

  return null;
}

function getPeriod(localTime: string): "morning" | "afternoon" | "evening" {
  const hour = Number(localTime.split(":")[0]);

  if (hour < 12) {
    return "morning";
  }

  if (hour < 17) {
    return "afternoon";
  }

  return "evening";
}

export function TimeStep({ service, onBack, onComplete }: TimeStepProps) {
  const [days, setDays] = useState<AvailabilityDay[]>([]);

  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(
    null,
  );

  const [timezone, setTimezone] = useState("Asia/Tehran");

  const [loadingDays, setLoadingDays] = useState(true);

  const [loadingSlots, setLoadingSlots] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    getAvailabilityDays(service.totalDurationMinutes, controller.signal)
      .then(async (result) => {
        setDays(result.days);
        setTimezone(result.timezone);

        const firstAvailableDay = result.days.find(
          (day) => day.isOpen && day.availableSlots > 0,
        );

        if (!firstAvailableDay) {
          return;
        }

        setSelectedDate(firstAvailableDay.date);
        setLoadingSlots(true);

        const slotResult = await getAvailabilitySlots(
          firstAvailableDay.date,
          service.totalDurationMinutes,
          controller.signal,
        );

        setSlots(slotResult.slots);
        setTimezone(slotResult.timezone);
      })
      .catch((requestError) => {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        ) {
          return;
        }

        setError("دریافت زمان‌های قابل رزرو با مشکل مواجه شد.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingDays(false);
          setLoadingSlots(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [service.totalDurationMinutes]);

  useEffect(() => {
    if (!selectedDate || loadingDays) {
      return;
    }

    const activeDate = selectedDate;

    let cancelled = false;

    async function refreshAvailability() {
      try {
        const [daysResult, slotsResult] = await Promise.all([
          getAvailabilityDays(service.totalDurationMinutes),

          getAvailabilitySlots(activeDate, service.totalDurationMinutes),
        ]);

        if (cancelled) {
          return;
        }

        setDays(daysResult.days);
        setSlots(slotsResult.slots);
        setTimezone(slotsResult.timezone);

        if (selectedSlot) {
          const freshSelectedSlot = slotsResult.slots.find(
            (slot) => slot.startAt === selectedSlot.startAt,
          );

          if (
            !freshSelectedSlot ||
            !freshSelectedSlot.isAvailable ||
            freshSelectedSlot.remainingCapacity <= 0
          ) {
            setSelectedSlot(null);

            setError(
              "زمانی که انتخاب کرده بودید دیگر در دسترس نیست. لطفاً یک ساعت دیگر انتخاب کنید.",
            );
          } else {
            setSelectedSlot(freshSelectedSlot);
          }
        }
      } catch {
        // خطاهای موقت Live Refresh
        // نباید فرم اصلی کاربر را خراب کنند.
      }
    }

    const interval = window.setInterval(() => {
      void refreshAvailability();
    }, 5000);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void refreshAvailability();
      }
    }

    function handleWindowFocus() {
      void refreshAvailability();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    window.addEventListener("focus", handleWindowFocus);

    return () => {
      cancelled = true;

      window.clearInterval(interval);

      document.removeEventListener("visibilitychange", handleVisibilityChange);

      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [loadingDays, selectedDate, selectedSlot, service.totalDurationMinutes]);

  async function selectDate(day: AvailabilityDay) {
    if (!day.isOpen || day.availableSlots <= 0 || day.date === selectedDate) {
      return;
    }

    setSelectedDate(day.date);
    setSelectedSlot(null);
    setSlots([]);
    setLoadingSlots(true);
    setError(null);

    try {
      const result = await getAvailabilitySlots(
        day.date,
        service.totalDurationMinutes,
      );

      setSlots(result.slots);
      setTimezone(result.timezone);
    } catch {
      setError("دریافت ساعت‌های این روز با مشکل مواجه شد.");
    } finally {
      setLoadingSlots(false);
    }
  }

  const selectedDay = useMemo(
    () => days.find((day) => day.date === selectedDate) ?? null,
    [days, selectedDate],
  );

  const groupedSlots = useMemo(
    () => ({
      morning: slots.filter((slot) => getPeriod(slot.localTime) === "morning"),
      afternoon: slots.filter(
        (slot) => getPeriod(slot.localTime) === "afternoon",
      ),
      evening: slots.filter((slot) => getPeriod(slot.localTime) === "evening"),
    }),
    [slots],
  );

  function completeStep() {
    if (!selectedDate || !selectedSlot) {
      return;
    }

    onComplete({
      date: selectedDate,
      startAt: selectedSlot.startAt,
      endAt: selectedSlot.endAt,
      localTime: selectedSlot.localTime,
      timezone,
      remainingCapacity: selectedSlot.remainingCapacity,
    });
  }

  if (loadingDays) {
    return (
      <div className="mt-5 rounded-[26px] border border-[var(--bw-border)] bg-[var(--bw-surface)] p-6 shadow-[var(--bw-shadow-soft)]">
        <div className="flex min-h-[220px] flex-col items-center justify-center">
          <LoaderCircle
            size={29}
            className="animate-spin text-[var(--bw-primary-600)]"
          />

          <p className="mt-4 text-[10px] font-bold text-slate-500">
            در حال بررسی زمان‌های آزاد...
          </p>

          <p className="mt-1 text-[8px] text-slate-400">
            ظرفیت BestWash در حال بررسی است.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[9px] font-extrabold text-[var(--bw-primary-600)]">
            مرحله سوم
          </p>

          <h2 className="mt-1 text-[16px] font-black text-slate-800">
            تاریخ و ساعت مراجعه
          </h2>

          <p className="mt-1 text-[8px] leading-5 text-slate-500">
            یکی از زمان‌های آزاد را برای مراجعه انتخاب کنید.
          </p>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="flex min-h-[40px] shrink-0 items-center gap-1 rounded-[13px] border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3 text-[8px] font-black text-slate-500 shadow-sm transition active:scale-95"
        >
          <ArrowRight size={13} />
          بازگشت
        </button>
      </div>

      <div className="mt-5 rounded-[21px] border border-blue-100 bg-[var(--bw-primary-50)] p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-white text-[var(--bw-primary-600)] shadow-sm">
            <Sparkles size={18} />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-[8px] text-slate-400">سرویس انتخاب‌شده</p>

            <div className="mt-1 flex items-center justify-between gap-3">
              <p className="truncate text-[11px] font-black text-slate-800">
                {service.package.nameFa}
              </p>

              <p className="shrink-0 text-[9px] font-black text-[var(--bw-primary-700)]">
                {formatToman(service.totalAmountRial)}
              </p>
            </div>

            <div className="mt-1 flex items-center gap-1 text-[7px] text-slate-500">
              <Clock3 size={10} />

              <span>
                حدود {toPersianDigits(String(service.totalDurationMinutes))}{" "}
                دقیقه
              </span>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mt-4 flex items-start gap-2 rounded-[15px] border border-red-100 bg-red-50 p-3 text-red-600">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />

          <p className="text-[8px] leading-5">{error}</p>
        </div>
      ) : null}

      <section className="mt-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className="text-[13px] font-black text-slate-800">
              انتخاب روز
            </h3>

            <p className="mt-1 text-[8px] text-slate-400">
              تاریخ‌ها به تقویم شمسی نمایش داده می‌شوند.
            </p>
          </div>

          <div className="flex items-center gap-1 text-[7px] font-bold text-slate-400">
            <CalendarDays size={12} />
            ۱۴ روز آینده
          </div>
        </div>

        <div
          dir="rtl"
          className="bw-scrollbar-hidden mt-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-2"
        >
          {days.map((day, index) => {
            const dateInfo = formatPersianDate(day.date);

            const selected = day.date === selectedDate;

            const unavailable = !day.isOpen || day.availableSlots <= 0;

            const stateLabel = getDayStateLabel(day);

            return (
              <button
                key={day.date}
                type="button"
                disabled={unavailable}
                onClick={() => {
                  void selectDate(day);
                }}
                className={`relative min-h-[112px] w-[78px] shrink-0 snap-start overflow-hidden rounded-[18px] border px-2 py-3 text-center transition ${
                  selected
                    ? "border-[#0d6de0] bg-[#0d6de0] text-white shadow-[0_10px_24px_rgba(13,109,224,0.22)]"
                    : unavailable
                      ? "cursor-not-allowed border-slate-200 bg-slate-100/70 text-slate-300"
                      : "border-[var(--bw-border)] bg-[var(--bw-surface)] text-slate-700"
                }`}
              >
                {index === 0 && !unavailable ? (
                  <span
                    className={`text-[6px] font-black ${
                      selected
                        ? "text-blue-100"
                        : "text-[var(--bw-primary-500)]"
                    }`}
                  >
                    امروز
                  </span>
                ) : index === 1 && !unavailable ? (
                  <span
                    className={`text-[6px] font-black ${
                      selected
                        ? "text-blue-100"
                        : "text-[var(--bw-primary-500)]"
                    }`}
                  >
                    فردا
                  </span>
                ) : (
                  <span className="text-[6px] font-bold opacity-65">
                    {dateInfo.weekday}
                  </span>
                )}

                <span className="mt-2 block text-[18px] font-black">
                  {dateInfo.day}
                </span>

                <span className="mt-0.5 block truncate text-[8px] font-bold">
                  {dateInfo.month}
                </span>

                {stateLabel ? (
                  <span
                    title={stateLabel}
                    className="mt-2 block max-h-8 overflow-hidden text-[6px] font-black leading-4 text-red-500"
                  >
                    {stateLabel}
                  </span>
                ) : (
                  <span
                    className={`mt-2 block text-[6px] ${
                      selected ? "text-blue-100" : "text-emerald-600"
                    }`}
                  >
                    {day.availableSlots} زمان آزاد
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {selectedDay ? (
        <section className="mt-6">
          <div className="rounded-[19px] border border-[var(--bw-border)] bg-[var(--bw-surface)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[8px] font-bold text-slate-400">
                  تاریخ انتخاب‌شده
                </p>

                <p className="mt-1 text-[11px] font-black text-slate-700">
                  {formatPersianDate(selectedDay.date).full}
                </p>
              </div>

              <CalendarDays
                size={20}
                className="text-[var(--bw-primary-600)]"
              />
            </div>
          </div>

          <div className="mt-5">
            <h3 className="text-[13px] font-black text-slate-800">
              انتخاب ساعت
            </h3>

            <p className="mt-1 text-[8px] text-slate-400">
              وضعیت ظرفیت به‌صورت خودکار به‌روزرسانی می‌شود؛ زمان‌های تکمیل
              ظرفیت قابل انتخاب نیستند.
            </p>
          </div>

          {loadingSlots ? (
            <div className="mt-4 flex min-h-[150px] items-center justify-center rounded-[20px] border border-[var(--bw-border)] bg-[var(--bw-surface)]">
              <LoaderCircle
                size={23}
                className="animate-spin text-[var(--bw-primary-600)]"
              />
            </div>
          ) : slots.length === 0 ? (
            <div className="mt-4 rounded-[20px] border border-dashed border-[var(--bw-border)] bg-[var(--bw-surface)] p-6 text-center">
              <Clock3 size={23} className="mx-auto text-slate-300" />

              <p className="mt-3 text-[9px] font-black text-slate-500">
                زمان آزادی برای این روز باقی نمانده است.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-5">
              {[
                {
                  key: "morning" as const,
                  title: "صبح",
                },
                {
                  key: "afternoon" as const,
                  title: "بعدازظهر",
                },
                {
                  key: "evening" as const,
                  title: "عصر",
                },
              ].map((period) => {
                const periodSlots = groupedSlots[period.key];

                if (periodSlots.length === 0) {
                  return null;
                }

                return (
                  <div key={period.key}>
                    <p className="mb-2.5 text-[8px] font-extrabold text-slate-500">
                      {period.title}
                    </p>

                    <div className="grid grid-cols-3 gap-2">
                      {periodSlots.map((slot) => {
                        const active = selectedSlot?.startAt === slot.startAt;
                        const unavailable =
                          !slot.isAvailable || slot.remainingCapacity <= 0;
                        return (
                          <button
                            key={slot.startAt}
                            type="button"
                            disabled={unavailable}
                            onClick={() => {
                              if (unavailable) {
                                return;
                              }

                              setSelectedSlot(slot);
                            }}
                            className={`relative min-h-[52px] rounded-[15px] border px-2 text-center transition ${
                              unavailable
                                ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300"
                                : active
                                  ? "border-[#0d6de0] bg-[#0d6de0] text-white shadow-[0_8px_20px_rgba(13,109,224,0.20)] active:scale-[0.98]"
                                  : "border-[var(--bw-border)] bg-[var(--bw-surface)] text-slate-700 active:scale-[0.98]"
                            }`}
                          >
                            {active ? (
                              <span className="absolute left-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white/20">
                                <Check size={9} />
                              </span>
                            ) : null}

                            <span
                              dir="ltr"
                              className="block text-[11px] font-black"
                            >
                              {toPersianDigits(slot.localTime)}
                            </span>

                            {unavailable ? (
                              <span className="mt-1 block text-[6px] font-black text-red-400">
                                {slot.reason ?? "تکمیل ظرفیت"}
                              </span>
                            ) : (
                              <span
                                className={`mt-1 block text-[6px] ${
                                  active ? "text-blue-100" : "text-emerald-600"
                                }`}
                              >
                                ظرفیت آزاد
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      <section className="mt-7 overflow-hidden rounded-[24px] border border-[var(--bw-border)] bg-[var(--bw-surface)] shadow-[var(--bw-shadow-card)]">
        <div className="p-5">
          <p className="text-[8px] font-bold text-slate-400">زمان مراجعه</p>

          {selectedDate && selectedSlot ? (
            <div className="mt-3 flex items-center gap-3 rounded-[17px] bg-[var(--bw-primary-50)] p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-white text-[var(--bw-primary-600)] shadow-sm">
                <Clock3 size={19} />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black text-slate-700">
                  {formatPersianDate(selectedDate).full}
                </p>

                <p
                  dir="rtl"
                  className="mt-1 text-[9px] font-bold text-[var(--bw-primary-700)]"
                >
                  ساعت{" "}
                  <span dir="ltr">
                    {toPersianDigits(selectedSlot.localTime)}
                  </span>
                </p>
              </div>

              <Check size={18} className="shrink-0 text-emerald-500" />
            </div>
          ) : (
            <div className="mt-3 rounded-[16px] border border-dashed border-[var(--bw-border)] bg-[var(--bw-bg)] p-4 text-center text-[8px] text-slate-400">
              ابتدا روز و ساعت مراجعه را انتخاب کنید.
            </div>
          )}
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-2 border-t border-[var(--bw-border)] bg-[var(--bw-bg)] p-3">
          <button
            type="button"
            onClick={onBack}
            className="flex min-h-[50px] items-center justify-center gap-1.5 rounded-[15px] border border-[var(--bw-border)] bg-[var(--bw-surface)] px-4 text-[9px] font-black text-slate-500"
          >
            <ArrowRight size={15} />
            برگشت
          </button>

          <button
            type="button"
            disabled={!selectedSlot}
            onClick={completeStep}
            className={`flex min-h-[50px] items-center justify-center gap-2 rounded-[15px] px-4 text-[10px] font-black transition ${
              selectedSlot
                ? "bg-[#0d6de0] text-white shadow-[0_10px_24px_rgba(13,109,224,0.22)] active:scale-[0.985]"
                : "cursor-not-allowed bg-slate-200 text-slate-400"
            }`}
          >
            ادامه و بررسی رزرو
            <ArrowLeft size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}
