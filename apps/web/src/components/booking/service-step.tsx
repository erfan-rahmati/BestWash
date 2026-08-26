"use client";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Plus,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  getServiceCatalog,
  type ServiceAddonOption,
  type ServiceCatalog,
} from "../../lib/api/service-catalog";
import type {
  BookingServiceSelection,
  BookingVehicleSelection,
} from "../../lib/booking-types";
import { BookingVehicleSummary } from "./booking-vehicle-summary";

interface ServiceStepProps {
  vehicle: BookingVehicleSelection;
  onBack: () => void;
  onComplete: (value: BookingServiceSelection) => void;
}

function formatToman(amountRial: number): string {
  const amountToman = Math.round(amountRial / 10);

  return `${new Intl.NumberFormat("fa-IR").format(amountToman)} تومان`;
}

function getVehicleTitle(vehicle: BookingVehicleSelection): string {
  if (vehicle.sourceMode === "CATALOG") {
    return [vehicle.brand?.nameFa, vehicle.model?.nameFa]
      .filter(Boolean)
      .join(" ");
  }

  return [vehicle.customBrand, vehicle.customModel].filter(Boolean).join(" ");
}

export function ServiceStep({ vehicle, onBack, onComplete }: ServiceStepProps) {
  const [catalog, setCatalog] = useState<ServiceCatalog | null>(null);

  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(
    null,
  );

  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCatalog() {
      try {
        const data = await getServiceCatalog(
          vehicle.vehicleClass.id,
          controller.signal,
        );

        setCatalog(data);

        const defaultPackage =
          data.packages.find((item) => item.isFeatured) ?? data.packages[0];

        setSelectedPackageId(defaultPackage?.id ?? null);
      } catch (requestError) {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        ) {
          return;
        }

        setError("دریافت پکیج‌های خدمات با مشکل مواجه شد.");
      } finally {
        setLoading(false);
      }
    }

    void loadCatalog();

    return () => {
      controller.abort();
    };
  }, [vehicle.vehicleClass.id]);

  const selectedPackage = useMemo(
    () =>
      catalog?.packages.find((item) => item.id === selectedPackageId) ?? null,
    [catalog, selectedPackageId],
  );

  const selectedAddons = useMemo<ServiceAddonOption[]>(
    () =>
      catalog?.addons.filter((addon) => selectedAddonIds.includes(addon.id)) ??
      [],
    [catalog, selectedAddonIds],
  );

  const totalAmountRial = useMemo(() => {
    if (!selectedPackage) {
      return 0;
    }

    return (
      selectedPackage.amountRial +
      selectedAddons.reduce((total, addon) => total + addon.amountRial, 0)
    );
  }, [selectedPackage, selectedAddons]);

  const totalDurationMinutes = useMemo(() => {
    if (!selectedPackage) {
      return 0;
    }

    return (
      selectedPackage.durationMinutes +
      selectedAddons.reduce((total, addon) => total + addon.durationMinutes, 0)
    );
  }, [selectedPackage, selectedAddons]);

  function toggleAddon(addonId: string) {
    setSelectedAddonIds((current) =>
      current.includes(addonId)
        ? current.filter((id) => id !== addonId)
        : [...current, addonId],
    );
  }

  function continueToTime() {
    if (!selectedPackage) {
      return;
    }

    onComplete({
      package: selectedPackage,
      addons: selectedAddons,
      totalAmountRial,
      totalDurationMinutes,
    });
  }

  if (loading) {
    return (
      <div className="mt-5 rounded-[26px] border border-[var(--bw-border)] bg-[var(--bw-surface)] p-6 shadow-[var(--bw-shadow-soft)]">
        <div className="flex min-h-[180px] flex-col items-center justify-center">
          <LoaderCircle
            size={28}
            className="animate-spin text-[var(--bw-primary-600)]"
          />

          <p className="mt-4 text-[10px] font-bold text-slate-500">
            در حال دریافت خدمات مناسب خودرو...
          </p>
        </div>
      </div>
    );
  }

  if (error || !catalog) {
    return (
      <div className="mt-5 rounded-[24px] border border-red-100 bg-red-50 p-5">
        <div className="flex items-start gap-3">
          <AlertCircle size={19} className="shrink-0 text-red-500" />

          <div>
            <p className="text-[11px] font-black text-red-700">
              دریافت خدمات انجام نشد
            </p>

            <p className="mt-1 text-[8px] leading-5 text-red-500">
              {error ?? "اطلاعات خدمات در دسترس نیست."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="mt-4 min-h-11 w-full rounded-[14px] border border-red-200 bg-white text-[9px] font-black text-red-600"
        >
          بازگشت به انتخاب خودرو
        </button>
      </div>
    );
  }

  return (
    <div className="mt-5">
      <BookingVehicleSummary
        vehicle={vehicle}
        vehicleTitle={getVehicleTitle(vehicle)}
        onBack={onBack}
      />

      <section className="mt-5">
        <div>
          <p className="text-[9px] font-extrabold text-[var(--bw-primary-600)]">
            مرحله دوم
          </p>

          <h2 className="mt-1 text-[16px] font-black text-slate-800">
            پکیج خدمات را انتخاب کنید
          </h2>

          <p className="mt-1 text-[9px] leading-5 text-slate-500">
            قیمت‌ها متناسب با کلاس خودروی شما محاسبه شده‌اند.
          </p>
        </div>

        <div className="mt-4 space-y-3">
          {catalog.packages.map((servicePackage) => {
            const active = selectedPackageId === servicePackage.id;

            return (
              <button
                key={servicePackage.id}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedPackageId(servicePackage.id)}
                className={`relative w-full overflow-hidden rounded-[22px] border p-4 text-right transition active:scale-[0.99] ${
                  active
                    ? "border-[var(--bw-primary-400)] bg-[var(--bw-primary-50)] shadow-[0_12px_28px_rgba(13,109,224,0.10)]"
                    : "border-[var(--bw-border)] bg-[var(--bw-surface)] shadow-[var(--bw-shadow-soft)]"
                }`}
              >
                {servicePackage.isFeatured ? (
                  <span className="absolute left-0 top-0 rounded-br-[15px] bg-[#0d6de0] px-3 py-1.5 text-[7px] font-black text-white">
                    پیشنهاد BestWash
                  </span>
                ) : null}

                <div className="flex items-start gap-3">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] ${
                      active
                        ? "bg-[#0d6de0] text-white"
                        : "bg-[var(--bw-bg)] text-slate-300"
                    }`}
                  >
                    {active ? (
                      <Check size={18} strokeWidth={2.8} />
                    ) : (
                      <span className="h-2.5 w-2.5 rounded-full bg-current" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[13px] font-black text-slate-800">
                        {servicePackage.nameFa}
                      </h3>

                      {servicePackage.badgeFa ? (
                        <span className="rounded-full border border-blue-100 bg-white px-2 py-1 text-[7px] font-bold text-[var(--bw-primary-600)]">
                          {servicePackage.badgeFa}
                        </span>
                      ) : null}
                    </div>

                    {servicePackage.descriptionFa ? (
                      <p className="mt-1.5 text-[8px] leading-5 text-slate-500">
                        {servicePackage.descriptionFa}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 flex items-end justify-between gap-3 border-t border-blue-100/70 pt-3">
                  <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-500">
                    <Clock3 size={13} />

                    <span>حدود {servicePackage.durationMinutes} دقیقه</span>
                  </div>

                  <div className="text-left">
                    <p className="text-[7px] text-slate-400">
                      قیمت برای خودروی شما
                    </p>

                    <p className="mt-0.5 text-[13px] font-black text-[var(--bw-primary-700)]">
                      {formatToman(servicePackage.amountRial)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {servicePackage.services.map((service) => (
                    <span
                      key={service.id}
                      className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-1 text-[7px] font-medium text-slate-500"
                    >
                      <CheckCircle2 size={10} className="text-emerald-500" />
                      {service.nameFa}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {selectedPackage ? (
        <section className="mt-7">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-[14px] font-black text-slate-800">
                خدمات تکمیلی
              </h2>

              <p className="mt-1 text-[8px] leading-5 text-slate-500">
                در صورت نیاز می‌توانید خدمات بیشتری به رزرو اضافه کنید.
              </p>
            </div>

            <span className="text-[8px] font-bold text-slate-400">اختیاری</span>
          </div>

          <div className="mt-3 space-y-2">
            {catalog.addons.map((addon) => {
              const active = selectedAddonIds.includes(addon.id);

              return (
                <button
                  key={addon.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleAddon(addon.id)}
                  className={`flex min-h-[72px] w-full items-center gap-3 rounded-[18px] border p-3.5 text-right transition active:scale-[0.99] ${
                    active
                      ? "border-[var(--bw-primary-300)] bg-[var(--bw-primary-50)]"
                      : "border-[var(--bw-border)] bg-[var(--bw-surface)]"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] ${
                      active
                        ? "bg-[#0d6de0] text-white"
                        : "bg-[var(--bw-bg)] text-slate-400"
                    }`}
                  >
                    {active ? <Check size={16} /> : <Plus size={16} />}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-black text-slate-700">
                        {addon.nameFa}
                      </span>

                      {addon.isRecommended ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[6px] font-bold text-emerald-600">
                          پیشنهادی
                        </span>
                      ) : null}
                    </span>

                    {addon.descriptionFa ? (
                      <span className="mt-1 block text-[7px] leading-4 text-slate-400">
                        {addon.descriptionFa}
                      </span>
                    ) : null}
                  </span>

                  <span className="shrink-0 text-left">
                    <span className="block text-[9px] font-black text-[var(--bw-primary-700)]">
                      +{formatToman(addon.amountRial)}
                    </span>

                    {addon.durationMinutes > 0 ? (
                      <span className="mt-1 block text-[7px] text-slate-400">
                        +{addon.durationMinutes} دقیقه
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="mt-6 overflow-hidden rounded-[24px] border border-[var(--bw-border)] bg-[var(--bw-surface)] shadow-[var(--bw-shadow-card)]">
        <div className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[8px] font-bold text-slate-400">خلاصه خدمات</p>

              <p className="mt-1 text-[12px] font-black text-slate-800">
                {selectedPackage
                  ? selectedPackage.nameFa
                  : "یک پکیج انتخاب کنید"}
              </p>
            </div>

            <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[var(--bw-primary-50)] text-[var(--bw-primary-600)]">
              <Sparkles size={19} />
            </span>
          </div>

          {selectedPackage ? (
            <>
              <div className="mt-4 space-y-2 border-t border-dashed border-[var(--bw-border)] pt-4">
                <div className="flex justify-between gap-3 text-[8px]">
                  <span className="text-slate-400">پکیج</span>

                  <span className="font-bold text-slate-600">
                    {formatToman(selectedPackage.amountRial)}
                  </span>
                </div>

                {selectedAddons.map((addon) => (
                  <div
                    key={addon.id}
                    className="flex justify-between gap-3 text-[8px]"
                  >
                    <span className="text-slate-400">{addon.nameFa}</span>

                    <span className="font-bold text-slate-600">
                      {formatToman(addon.amountRial)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-end justify-between rounded-[17px] bg-[var(--bw-primary-50)] p-4">
                <div>
                  <p className="text-[7px] text-slate-500">مدت زمان تقریبی</p>

                  <p className="mt-1 text-[10px] font-black text-slate-700">
                    {totalDurationMinutes} دقیقه
                  </p>
                </div>

                <div className="text-left">
                  <p className="text-[7px] text-slate-500">مبلغ کل</p>

                  <p className="mt-1 text-[15px] font-black text-[#0d6de0]">
                    {formatToman(totalAmountRial)}
                  </p>
                </div>
              </div>
            </>
          ) : null}
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
            disabled={!selectedPackage}
            onClick={continueToTime}
            className={`flex min-h-[50px] items-center justify-center gap-2 rounded-[15px] px-4 text-[10px] font-black transition ${
              selectedPackage
                ? "bg-[#0d6de0] text-white shadow-[0_10px_24px_rgba(13,109,224,0.22)] active:scale-[0.985]"
                : "cursor-not-allowed bg-slate-200 text-slate-400"
            }`}
          >
            ادامه به انتخاب زمان
            <ArrowLeft size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}
