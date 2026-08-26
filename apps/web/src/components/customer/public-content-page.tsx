"use client";

import {
  ArrowUpLeft,
  Building2,
  CheckCircle2,
  Clock3,
  Headphones,
  LoaderCircle,
  MapPinned,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getPublicContent } from "../../lib/api/account";
import {
  safeGoogleMapsEmbedUrl,
  safeHttpUrl,
  safeTelephoneUrl,
} from "../../lib/safe-url";
import { PageHeading } from "../ui/page-heading";

type Kind = "about" | "contact" | "rules";

export function PublicContentPage({ kind }: { kind: Kind }) {
  const [content, setContent] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    getPublicContent()
      .then((data) => setContent(data.content))
      .catch(() => setContent({}));
  }, []);
  if (!content)
    return (
      <div className="flex min-h-52 items-center justify-center">
        <LoaderCircle className="animate-spin text-blue-600" />
      </div>
    );

  if (kind === "about") {
    const about = (content.about ?? {}) as {
      eyebrow?: string;
      title?: string;
      description?: string;
      subtitle?: string;
      body?: string;
      values?: string[];
      stats?: string[];
    };
    return (
      <div>
        <PageHeading
          eyebrow={about.eyebrow ?? "داستان ما"}
          title={about.title ?? "درباره BestWash"}
          description={
            about.description ??
            "تجربه‌ای هوشمند، شفاف و قابل اعتماد برای مراقبت از خودرو."
          }
        />
        <div className="mt-6 space-y-4">
          <section className="relative overflow-hidden rounded-[28px] border border-blue-100 bg-[linear-gradient(145deg,#ffffff,#e7f3ff)] p-6 shadow-[var(--bw-shadow-soft)]">
            <div className="absolute -left-10 -top-10 size-36 rounded-full bg-cyan-200/40 blur-3xl" />
            <span className="relative grid size-13 place-items-center rounded-[18px] bg-blue-600 text-white shadow-[0_12px_25px_rgba(13,109,224,.24)]">
              <Building2 />
            </span>
            <p className="relative mt-5 text-[9px] font-black text-blue-600">
              داستان BestWash
            </p>
            <h2 className="relative mt-1 text-[19px] font-black leading-8 text-slate-900">
              {about.subtitle ??
                "مراقبت حرفه‌ای از خودرو، دقیق و قابل برنامه‌ریزی"}
            </h2>
            <p className="relative mt-4 text-[11px] leading-8 text-slate-600">
              {about.body ??
                "BestWash تجربه‌ای سریع، شفاف و قابل پیگیری برای رزرو آنلاین کارواش فراهم می‌کند."}
            </p>
          </section>
          <div className="grid grid-cols-3 gap-2">
            {(about.stats ?? ["رزرو آنلاین", "پرداخت امن", "پیگیری زنده"]).map(
              (item) => (
                <div
                  key={item}
                  className="rounded-[17px] border border-white bg-white/75 p-3 text-center shadow-sm"
                >
                  <Sparkles size={16} className="mx-auto text-blue-600" />
                  <p className="mt-2 text-[8px] font-black leading-4 text-slate-700">
                    {item}
                  </p>
                </div>
              ),
            )}
          </div>
          <section className="rounded-[24px] border border-[var(--bw-border)] bg-white p-5">
            <h3 className="text-[13px] font-black text-slate-900">
              ارزش‌هایی که به آن‌ها متعهدیم
            </h3>
            <div className="mt-4 space-y-2">
              {(
                about.values ?? [
                  "کیفیت پایدار",
                  "احترام به زمان مشتری",
                  "قیمت‌گذاری شفاف",
                ]
              ).map((value) => (
                <div
                  key={value}
                  className="flex min-h-14 items-center gap-3 rounded-[17px] bg-slate-50 px-4"
                >
                  <CheckCircle2
                    className="shrink-0 text-emerald-500"
                    size={19}
                  />
                  <span className="text-[10px] font-bold leading-5 text-slate-700">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (kind === "rules") {
    const rules = (content.rules ?? {}) as {
      eyebrow?: string;
      title?: string;
      description?: string;
      intro?: string;
      items?: string[];
    };
    const items = rules.items ?? [
      "اطلاعات رزرو باید صحیح و کامل وارد شود.",
      "لغو رزرو طبق مهلت نمایش‌داده‌شده انجام می‌شود.",
    ];
    return (
      <div>
        <PageHeading
          eyebrow={rules.eyebrow ?? "شفاف و روشن"}
          title={rules.title ?? "قوانین و شرایط استفاده"}
          description={
            rules.description ??
            "پیش از ثبت رزرو، شرایط ارائه خدمت و لغو را مطالعه کنید."
          }
        />
        <div className="mt-6 space-y-4">
          <div className="rounded-[24px] border border-blue-100 bg-blue-50 p-5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-blue-600" />
              <b className="text-[13px] text-slate-900">
                تعهد دوطرفه برای تجربه بهتر
              </b>
            </div>
            <p className="mt-3 text-[10px] leading-6 text-slate-600">
              {rules.intro ??
                "این قوانین برای حفظ زمان، امنیت و حقوق همه مشتریان تدوین شده‌اند."}
            </p>
          </div>
          <div className="space-y-3">
            {items.map((item, index) => (
              <article
                key={`${index}-${item}`}
                className="flex items-start gap-3 rounded-[22px] border border-[var(--bw-border)] bg-white p-4 shadow-sm"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-[12px] bg-blue-50 text-[11px] font-black text-blue-700">
                  {(index + 1).toLocaleString("fa-IR")}
                </span>
                <p className="pt-1 text-[10px] leading-7 text-slate-600">
                  {item}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const contact = (content.contact ?? {}) as {
    eyebrow?: string;
    title?: string;
    description?: string;
    intro?: string;
    phone?: string;
    address?: string;
    whatsapp?: string;
    bale?: string;
    mapUrl?: string;
    mapEmbedUrl?: string;
    workingHours?: string;
  };
  const mapEmbedUrl = safeGoogleMapsEmbedUrl(
    contact.mapEmbedUrl,
    contact.address,
  );
  const mapUrl = safeHttpUrl(contact.mapUrl, "https://www.google.com/maps");
  return (
    <div>
      <PageHeading
        eyebrow={contact.eyebrow ?? "راه‌های ارتباطی"}
        title={contact.title ?? "تماس با ما"}
        description={
          contact.description ??
          "برای پرسش‌های عمومی از راه‌های زیر با BestWash در ارتباط باشید."
        }
      />
      <div className="mt-6 space-y-4">
        <div className="rounded-[25px] border border-blue-100 bg-[linear-gradient(135deg,#0d6de0,#22a7df)] p-5 text-white shadow-[var(--bw-shadow-blue)]">
          <Headphones size={23} />
          <h2 className="mt-4 text-[17px] font-black">کنار شما هستیم</h2>
          <p className="mt-2 text-[10px] leading-6 text-blue-50">
            {contact.intro ??
              "پاسخ‌گویی شفاف و سریع، بخشی از تجربه BestWash است."}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <ContactAction
            icon={Phone}
            title="تماس تلفنی"
            value={contact.phone || "اعلام می‌شود"}
            href={safeTelephoneUrl(contact.phone) || undefined}
          />
          <ContactAction
            icon={Clock3}
            title="ساعات پاسخ‌گویی"
            value={contact.workingHours || "همه‌روزه ۸ تا ۲۲"}
          />
          <ContactAction
            icon={MessageCircle}
            title="واتساپ"
            value="شروع گفت‌وگو"
            href={safeHttpUrl(contact.whatsapp) || undefined}
            tone="emerald"
          />
          <ContactAction
            icon={MessageCircle}
            title="پیام‌رسان بله"
            value="شروع گفت‌وگو"
            href={safeHttpUrl(contact.bale) || undefined}
          />
        </div>
        <a
          href={mapUrl}
          target="_blank"
          rel="noreferrer"
          className="group block overflow-hidden rounded-[24px] border border-[var(--bw-border)] bg-white shadow-sm"
        >
          <div className="relative h-44 bg-slate-100">
            <iframe
              title="موقعیت BestWash روی نقشه"
              src={mapEmbedUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="pointer-events-none h-full w-full border-0"
            />
            <span className="absolute bottom-3 left-3 grid size-10 place-items-center rounded-[13px] bg-white text-blue-600 shadow-lg">
              <ArrowUpLeft size={18} />
            </span>
          </div>
          <div className="flex items-start gap-3 p-4">
            <MapPinned className="shrink-0 text-blue-600" />
            <div>
              <b className="text-[11px] text-slate-800">نشانی مجموعه</b>
              <p className="mt-1 text-[9px] leading-5 text-slate-500">
                {contact.address || "بابلسر، مجموعه کارواش اتوماتیک BestWash"}
              </p>
            </div>
          </div>
        </a>
      </div>
    </div>
  );
}

function ContactAction({
  icon: Icon,
  title,
  value,
  href,
  tone = "blue",
}: {
  icon: typeof Phone;
  title: string;
  value: string;
  href?: string;
  tone?: "blue" | "emerald";
}) {
  const body = (
    <>
      <span
        className={`grid size-10 place-items-center rounded-[13px] ${tone === "emerald" ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"}`}
      >
        <Icon size={18} />
      </span>
      <b className="mt-3 block text-[10px] text-slate-800">{title}</b>
      <span className="mt-1 block text-[8px] leading-4 text-slate-500">
        {value}
      </span>
    </>
  );
  return href ? (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel="noreferrer"
      className="rounded-[20px] border border-[var(--bw-border)] bg-white p-4 shadow-sm"
    >
      {body}
    </a>
  ) : (
    <div className="rounded-[20px] border border-[var(--bw-border)] bg-white p-4 shadow-sm">
      {body}
    </div>
  );
}
