import Link from "next/link";
import { ArrowLeft, CarFront, History } from "lucide-react";

export function QuickActions() {
  return (
    <section className="px-5 pt-6">
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/vehicles"
          className="group relative overflow-hidden rounded-[22px] border border-[var(--bw-border)] bg-white p-4 shadow-[var(--bw-shadow-soft)] transition active:scale-[0.985]"
        >
          <div className="absolute -left-5 -top-5 h-20 w-20 rounded-full bg-blue-100/50 blur-2xl" />

          <span className="relative flex h-10 w-10 items-center justify-center rounded-[14px] bg-[var(--bw-primary-50)] text-[var(--bw-primary-600)]">
            <CarFront size={20} />
          </span>

          <p className="relative mt-4 text-[12px] font-black text-slate-800">
            خودروهای من
          </p>

          <p className="relative mt-1 text-[9px] leading-5 text-slate-400">
            افزودن و مدیریت خودرو
          </p>

          <ArrowLeft
            size={15}
            className="absolute bottom-4 left-4 text-slate-300"
          />
        </Link>

        <Link
          href="/bookings"
          className="group relative overflow-hidden rounded-[22px] border border-[var(--bw-border)] bg-white p-4 shadow-[var(--bw-shadow-soft)] transition active:scale-[0.985]"
        >
          <div className="absolute -right-4 -bottom-5 h-20 w-20 rounded-full bg-cyan-100/50 blur-2xl" />

          <span className="relative flex h-10 w-10 items-center justify-center rounded-[14px] bg-cyan-50 text-cyan-600">
            <History size={20} />
          </span>

          <p className="relative mt-4 text-[12px] font-black text-slate-800">
            رزروهای من
          </p>

          <p className="relative mt-1 text-[9px] leading-5 text-slate-400">
            پیگیری و مشاهده سوابق
          </p>

          <ArrowLeft
            size={15}
            className="absolute bottom-4 left-4 text-slate-300"
          />
        </Link>
      </div>
    </section>
  );
}
