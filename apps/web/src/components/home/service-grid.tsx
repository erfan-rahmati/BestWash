import { Droplets, ShieldCheck, Sparkles, Wind } from "lucide-react";
import { SectionHeader } from "../ui/section-header";

const services = [
  {
    title: "شست‌وشوی کامل",
    description: "بدنه، رینگ و نظافت",
    label: "محبوب",
    icon: Droplets,
    iconClass: "bg-blue-50 text-[var(--bw-primary-600)]",
  },
  {
    title: "نظافت کابین",
    description: "نظافت کامل فضای داخل",
    label: "داخلی",
    icon: Sparkles,
    iconClass: "bg-cyan-50 text-cyan-600",
  },
  {
    title: "خشک‌کردن ویژه",
    description: "بدون لک و رطوبت",
    label: "ویژه",
    icon: Wind,
    iconClass: "bg-sky-50 text-sky-600",
  },
  {
    title: "محافظت بدنه",
    description: "مراقبت از رنگ خودرو",
    label: "پریمیوم",
    icon: ShieldCheck,
    iconClass: "bg-indigo-50 text-indigo-600",
  },
] as const;

export function ServiceGrid() {
  return (
    <section className="px-5 pt-8">
      <SectionHeader
        title="خدمات BestWash"
        description="خدمت مناسب خودروی خود را انتخاب کنید"
        href="/booking"
        actionLabel="رزرو"
      />

      <div className="mt-4 grid grid-cols-2 gap-3">
        {services.map((service) => {
          const Icon = service.icon;

          return (
            <article
              key={service.title}
              className="relative min-h-[142px] overflow-hidden rounded-[22px] border border-[var(--bw-border)] bg-white p-4 shadow-[var(--bw-shadow-soft)]"
            >
              <div className="absolute -left-8 -bottom-8 h-24 w-24 rounded-full bg-blue-100/30 blur-2xl" />

              <div className="relative flex items-start justify-between gap-2">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] ${service.iconClass}`}
                >
                  <Icon size={19} />
                </span>

                <span className="rounded-full border border-blue-100 bg-blue-50/70 px-2 py-1 text-[7px] font-bold text-[var(--bw-primary-600)]">
                  {service.label}
                </span>
              </div>

              <h3 className="relative mt-4 text-[11px] font-black text-slate-800">
                {service.title}
              </h3>

              <p className="relative mt-1 text-[8px] leading-4 text-slate-400">
                {service.description}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
