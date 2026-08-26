import { ShieldCheck } from "lucide-react";
import { VehicleManager } from "../../../components/customer/vehicle-manager";
import { PageHeading } from "../../../components/ui/page-heading";

export default function VehiclesPage() {
  return (
    <div className="px-5 pb-4 pt-6">
      <PageHeading
        eyebrow="گاراژ BestWash"
        title="خودروهای من"
        description="خودروهایی که برای رزرو استفاده می‌کنی از این قسمت مدیریت می‌شوند."
      />

      <div className="mt-6">
        <VehicleManager />
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-[20px] border border-blue-100 bg-[var(--bw-primary-50)] p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-white text-[var(--bw-primary-600)] shadow-sm">
          <ShieldCheck size={19} />
        </span>

        <div>
          <p className="text-[10px] font-black text-slate-700">
            اطلاعات خودرو محفوظ می‌ماند
          </p>

          <p className="mt-1 text-[8px] leading-4 text-slate-500">
            اطلاعات ذخیره‌شده فقط برای ساده‌تر شدن رزروهای شما استفاده می‌شود.
          </p>
        </div>
      </div>
    </div>
  );
}
