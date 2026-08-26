"use client";

import { Award, Droplets, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getPublicContent } from "../../lib/api/account";
import { safeHttpUrl } from "../../lib/safe-url";

export function AppFooter() {
  const [footer, setFooter] = useState<Record<string, unknown>>({});

  useEffect(() => {
    void getPublicContent()
      .then((result) => {
        const value = result.content.footer;
        setFooter(
          value && typeof value === "object"
            ? (value as Record<string, unknown>)
            : {},
        );
      })
      .catch(() => setFooter({}));
  }, []);

  const description = String(
    footer.description ??
      "رزرو سریع و شفاف خدمات کارواش، پرداخت امن و پیگیری مرحله‌به‌مرحله وضعیت خودرو؛ همه در یک تجربه ساده و قابل اعتماد.",
  );
  const enamadLogoUrl = safeHttpUrl(footer.enamadLogoUrl);
  const enamadVerifyUrl = safeHttpUrl(footer.enamadVerifyUrl);

  return (
    <footer className="px-5 pb-8 pt-10">
      <div className="bw-water-line mb-5" />

      <div className="rounded-[26px] border border-white/80 bg-white/55 p-5 shadow-[0_15px_35px_rgba(52,106,153,.08)] backdrop-blur-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-[11px] bg-[var(--bw-primary-50)] text-[var(--bw-primary-600)]">
                <Droplets size={16} />
              </span>

              <span className="text-[14px] font-black tracking-[-0.03em] text-[var(--bw-primary-700)]">
                BestWash
              </span>
            </div>

            <p className="mt-2 text-[9px] leading-5 text-slate-400">
              {description}
            </p>
          </div>

          <a
            href={enamadVerifyUrl || undefined}
            target={enamadVerifyUrl ? "_blank" : undefined}
            rel="noreferrer"
            aria-label="مشاهده اعتبار نماد اعتماد الکترونیکی"
            className="flex min-h-[82px] w-[74px] shrink-0 flex-col items-center justify-center overflow-hidden rounded-[17px] border border-blue-100 bg-white p-2 text-center shadow-sm"
          >
            {enamadLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- Trust mark URL is managed by the administrator.
              <img
                src={enamadLogoUrl}
                alt="نماد اعتماد الکترونیکی BestWash"
                className="max-h-14 max-w-full object-contain"
              />
            ) : (
              <>
                <Award size={23} className="text-blue-600" />
                <span className="mt-1 text-[7px] font-black leading-3 text-slate-600">
                  محل نماد اعتماد
                </span>
              </>
            )}
          </a>
        </div>

        <nav
          aria-label="پیوندهای اطلاعاتی"
          className="mt-5 grid grid-cols-2 gap-2 text-center text-[9px] font-black text-slate-600"
        >
          <FooterLink href="/about">درباره BestWash</FooterLink>
          <FooterLink href="/contact">راه‌های ارتباطی</FooterLink>
          <FooterLink href="/blog">مجله و آموزش</FooterLink>
          <FooterLink href="/rules">قوانین استفاده</FooterLink>
        </nav>

        <div className="mt-5 flex items-center gap-3 rounded-[16px] bg-blue-50/75 px-3 py-3 text-[8px] leading-5 text-slate-500">
          <span className="grid size-8 shrink-0 place-items-center rounded-[11px] bg-white text-blue-600 shadow-sm">
            <ShieldCheck size={16} />
          </span>
          پرداخت امن، حفاظت از اطلاعات مشتری و پشتیبانی پاسخ‌گو
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-slate-200/70 pt-4 text-[10px] font-medium text-slate-400">
        <span>© ۱۴۰۵ BestWash</span>
        <a
          href="https://erfanmdev.ir/"
          target="_blank"
          rel="noreferrer"
          className="bw-credit-shimmer font-bold text-blue-700"
        >
          طراحی و توسعه عرفان رحمتی
        </a>
      </div>
    </footer>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-[13px] border border-white bg-white/75 px-2 py-3 transition hover:border-blue-200 hover:text-blue-700"
    >
      {children}
    </Link>
  );
}
