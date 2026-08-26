import { ArrowRight, CarFront, Palette } from "lucide-react";
import type { BookingVehicleSelection } from "../../lib/booking-types";
import { IranLicensePlateDisplay } from "./iran-license-plate-display";

interface BookingVehicleSummaryProps {
  vehicle: BookingVehicleSelection;
  vehicleTitle: string;
  onBack: () => void;
}

const colorSwatches: Record<string, string> = {
  سفید: "#f8fafc",
  مشکی: "#172033",
  نقره‌ای: "#b9c3cf",
  خاکستری: "#727e8d",
  آبی: "#2475d0",
  قرمز: "#d64242",
};

export function BookingVehicleSummary({
  vehicle,
  vehicleTitle,
  onBack,
}: BookingVehicleSummaryProps) {
  const swatch = colorSwatches[vehicle.color];

  return (
    <section className="overflow-hidden rounded-[24px] border border-[var(--bw-primary-100)] bg-[var(--bw-surface)] shadow-[var(--bw-shadow-soft)]">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--bw-border)] p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-[var(--bw-primary-50)] text-[var(--bw-primary-600)]">
            <CarFront size={20} />
          </span>

          <div className="min-w-0">
            <p className="text-[8px] font-extrabold text-[var(--bw-primary-600)]">
              خدمات برای
            </p>

            <h2 className="mt-0.5 truncate text-[12px] font-black text-slate-800">
              {vehicleTitle}
            </h2>

            <p className="mt-1 text-[8px] text-slate-400">
              کلاس {vehicle.vehicleClass.nameFa}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="flex min-h-[38px] shrink-0 items-center gap-1 rounded-[12px] border border-[var(--bw-border)] bg-[var(--bw-bg)] px-3 text-[8px] font-black text-slate-500 transition active:scale-95"
        >
          <ArrowRight size={13} />
          بازگشت
        </button>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-[auto_1fr] items-center gap-3 rounded-[16px] bg-[var(--bw-bg)] p-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-white text-[var(--bw-primary-600)] shadow-sm">
            <Palette size={17} />
          </span>

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[7px] font-medium text-slate-400">رنگ خودرو</p>

              <p className="mt-0.5 text-[10px] font-black text-slate-700">
                {vehicle.color}
              </p>
            </div>

            {swatch ? (
              <span
                aria-hidden="true"
                className="h-5 w-5 shrink-0 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(148,163,184,0.45)]"
                style={{
                  backgroundColor: swatch,
                }}
              />
            ) : (
              <span className="rounded-full border border-[var(--bw-border)] bg-white px-2 py-1 text-[7px] font-bold text-slate-500">
                رنگ سفارشی
              </span>
            )}
          </div>
        </div>

        <div className="mt-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[8px] font-extrabold text-slate-600">
              پلاک خودرو
            </p>

            <span className="text-[7px] font-medium text-slate-400">
              فقط نمایش
            </span>
          </div>

          <IranLicensePlateDisplay plate={vehicle.plate} compact />
        </div>
      </div>
    </section>
  );
}
