"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CarFront, Home, Plus, UserRound } from "lucide-react";

const items = [
  {
    href: "/",
    label: "خانه",
    icon: Home,
  },
  {
    href: "/bookings",
    label: "رزروها",
    icon: CalendarDays,
  },
  {
    href: "/vehicles",
    label: "خودروها",
    icon: CarFront,
  },
  {
    href: "/profile",
    label: "حساب",
    icon: UserRound,
  },
] as const;

function routeIsActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();

  const bookingActive =
    pathname === "/booking" || pathname.startsWith("/booking/");

  const firstItems = items.slice(0, 2);
  const lastItems = items.slice(2);

  return (
    <nav className="relative z-50 shrink-0 border-t border-[var(--bw-border)] bg-[rgba(250,252,254,0.96)] px-3 pb-[max(8px,env(safe-area-inset-bottom))] pt-5 backdrop-blur-2xl">
      <div className="relative grid min-h-[66px] grid-cols-5 items-center rounded-[22px]">
        {firstItems.map((item) => {
          const active = routeIsActive(pathname, item.href);

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className="flex h-full flex-col items-center justify-center gap-1"
            >
              <Icon
                size={19}
                strokeWidth={active ? 2.6 : 1.85}
                className={
                  active ? "text-[var(--bw-primary-600)]" : "text-slate-400"
                }
              />

              <span
                className={
                  active
                    ? "text-[9px] font-black text-[var(--bw-primary-600)]"
                    : "text-[9px] font-medium text-slate-400"
                }
              >
                {item.label}
              </span>

              <span
                className={
                  active
                    ? "h-1 w-1 rounded-full bg-[var(--bw-primary-500)]"
                    : "h-1 w-1"
                }
              />
            </Link>
          );
        })}

        <div className="relative flex h-full items-center justify-center">
          <Link
            href="/booking"
            aria-label="رزرو جدید"
            aria-current={bookingActive ? "page" : undefined}
            className="absolute -top-[37px] z-20 flex flex-col items-center"
          >
            <span
              className={`relative flex h-[60px] w-[60px] items-center justify-center rounded-full border-[5px] border-[var(--bw-bg)] transition duration-200 active:scale-95 ${
                bookingActive
                  ? "bg-[linear-gradient(135deg,#3398f4_0%,#1477ea_46%,#0d61cf_100%)] text-white shadow-[0_14px_32px_rgba(13,109,224,0.34)]"
                  : "bg-[var(--bw-surface)] text-[#0d6de0] shadow-[0_12px_30px_rgba(31,83,135,0.16)] ring-1 ring-blue-100"
              }`}
            >
              <Plus size={29} strokeWidth={3} className="relative z-10" />

              <span
                className={`absolute inset-[5px] rounded-full border ${
                  bookingActive ? "border-white/20" : "border-blue-100/80"
                }`}
              />
            </span>

            <span
              className={`mt-1 text-[9px] font-black ${
                bookingActive
                  ? "text-[var(--bw-primary-700)]"
                  : "text-slate-500"
              }`}
            >
              رزرو
            </span>
          </Link>
        </div>

        {lastItems.map((item) => {
          const active = routeIsActive(pathname, item.href);

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className="flex h-full flex-col items-center justify-center gap-1"
            >
              <Icon
                size={19}
                strokeWidth={active ? 2.6 : 1.85}
                className={
                  active ? "text-[var(--bw-primary-600)]" : "text-slate-400"
                }
              />

              <span
                className={
                  active
                    ? "text-[9px] font-black text-[var(--bw-primary-600)]"
                    : "text-[9px] font-medium text-slate-400"
                }
              >
                {item.label}
              </span>

              <span
                className={
                  active
                    ? "h-1 w-1 rounded-full bg-[var(--bw-primary-500)]"
                    : "h-1 w-1"
                }
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
