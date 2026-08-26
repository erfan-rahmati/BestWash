"use client";

import type { LucideIcon } from "lucide-react";
import {
  BadgePercent,
  BellRing,
  BookOpenText,
  CalendarCheck2,
  CarFront,
  ChartNoAxesCombined,
  CircleDollarSign,
  Clock3,
  Images,
  LayoutDashboard,
  LibraryBig,
  MessageCircleMore,
  MessagesSquare,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { getApiBaseUrl } from "../../lib/api/base-url";

export type JsonRecord = Record<string, unknown>;
export type AdminSection =
  | "dashboard"
  | "bookings"
  | "manual"
  | "customers"
  | "payments"
  | "content"
  | "catalog"
  | "marketing"
  | "articles"
  | "media"
  | "support"
  | "messages"
  | "settings"
  | "logs";

export type NavigationItem = {
  id: AdminSection;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
};

export const navigation: NavigationItem[] = [
  {
    id: "dashboard",
    label: "داشبورد",
    shortLabel: "خانه",
    description: "نبض امروز کسب‌وکار و اقدام‌های فوری",
    icon: LayoutDashboard,
  },
  {
    id: "bookings",
    label: "مدیریت رزروها",
    shortLabel: "رزروها",
    description: "بررسی، پذیرش، انجام و تحویل خودرو",
    icon: CalendarCheck2,
  },
  {
    id: "manual",
    label: "ثبت رزرو دستی",
    shortLabel: "رزرو دستی",
    description: "ساخت رزرو و ارسال لینک پرداخت برای مشتری",
    icon: CarFront,
  },
  {
    id: "customers",
    label: "مشتریان و باشگاه",
    shortLabel: "مشتریان",
    description: "پروفایل، امتیاز، کیف پول و سطح مشتری",
    icon: Users,
  },
  {
    id: "payments",
    label: "پرداخت‌ها",
    shortLabel: "مالی",
    description: "تراکنش‌ها، بازپرداخت‌ها و شماره پیگیری",
    icon: CircleDollarSign,
  },
  {
    id: "content",
    label: "اسلایدر و بنر",
    shortLabel: "ویترین",
    description: "مدیریت تصاویر و مقصدهای صفحه اصلی",
    icon: Images,
  },
  {
    id: "catalog",
    label: "کاتالوگ خدمات",
    shortLabel: "کاتالوگ",
    description: "خودروها، خدمات، پکیج‌ها و اتوماسیون",
    icon: LibraryBig,
  },
  {
    id: "marketing",
    label: "تخفیف و بازاریابی",
    shortLabel: "بازاریابی",
    description: "کمپین، شرایط استفاده و کانال اطلاع‌رسانی",
    icon: BadgePercent,
  },
  {
    id: "articles",
    label: "مقالات",
    shortLabel: "مقالات",
    description: "نوشتن، ویرایش و انتشار محتوای مجله",
    icon: BookOpenText,
  },
  {
    id: "media",
    label: "رسانه‌ها",
    shortLabel: "رسانه",
    description: "آپلود، پیش‌نمایش و کپی نشانی فایل‌ها",
    icon: Images,
  },
  {
    id: "support",
    label: "پشتیبانی مشتریان",
    shortLabel: "پشتیبانی",
    description: "گفت‌وگو و پاسخ به تیکت‌های مشتریان",
    icon: MessageCircleMore,
  },
  {
    id: "messages",
    label: "پیامک‌ها",
    shortLabel: "پیامک",
    description: "قالب‌ها، ارسال گروهی و تاریخچه پیامک",
    icon: MessagesSquare,
  },
  {
    id: "settings",
    label: "تنظیمات کسب‌وکار",
    shortLabel: "تنظیمات",
    description: "ساعات کاری، تعطیلی‌ها و تنظیمات عمومی",
    icon: Settings2,
  },
  {
    id: "logs",
    label: "لاگ و امنیت",
    shortLabel: "امنیت",
    description: "ردپای مدیر، برنامه و رخدادهای امنیتی",
    icon: ShieldCheck,
  },
];

const statusCopy: Record<
  string,
  { label: string; tone: Tone; description: string }
> = {
  PENDING_PAYMENT: {
    label: "در انتظار پرداخت",
    tone: "amber",
    description: "پرداخت رزرو هنوز نهایی نشده است.",
  },
  UNDER_REVIEW: {
    label: "در انتظار تأیید مدیر",
    tone: "violet",
    description: "پرداخت انجام شده و مدیر باید رزرو را تأیید یا رد کند.",
  },
  CONFIRMED: {
    label: "تأیید شده",
    tone: "blue",
    description: "زمان مراجعه برای مشتری قطعی است.",
  },
  CHECKED_IN: {
    label: "زمان مراجعه / در انتظار پذیرش",
    tone: "cyan",
    description: "زمان رزرو رسیده و پذیرش خودرو باید ثبت شود.",
  },
  IN_QUEUE: {
    label: "در صف خدمات",
    tone: "cyan",
    description: "خودرو پذیرش شده و منتظر شروع خدمت است.",
  },
  IN_PROGRESS: {
    label: "در حال انجام خدمات",
    tone: "violet",
    description: "کار روی خودرو در حال انجام است.",
  },
  READY_FOR_PICKUP: {
    label: "آماده تحویل",
    tone: "green",
    description: "خدمت تمام شده و کد تحویل ارسال شده است.",
  },
  DELIVERED: {
    label: "تحویل داده شد",
    tone: "green",
    description: "خودرو با کد امن به تحویل‌گیرنده داده شد.",
  },
  COMPLETED: {
    label: "تکمیل شده",
    tone: "slate",
    description: "چرخه رزرو و پاداش‌ها کامل شده است.",
  },
  CANCELLED: {
    label: "لغو شده",
    tone: "red",
    description: "رزرو لغو شده است.",
  },
  NO_SHOW: {
    label: "عدم مراجعه",
    tone: "red",
    description: "مشتری در زمان مقرر مراجعه نکرده است.",
  },
  ADMIN_REJECTED: {
    label: "رد و بازپرداخت شده",
    tone: "red",
    description: "رزرو توسط مدیر رد و مبلغ به کیف پول بازگردانده شد.",
  },
  CREATED: {
    label: "ایجاد شده",
    tone: "slate",
    description: "درخواست پرداخت ایجاد شده است.",
  },
  PENDING: {
    label: "در حال پردازش",
    tone: "amber",
    description: "نتیجه نهایی هنوز دریافت نشده است.",
  },
  REDIRECTED: {
    label: "هدایت به درگاه",
    tone: "blue",
    description: "مشتری به صفحه پرداخت هدایت شده است.",
  },
  PAID: {
    label: "پرداخت موفق",
    tone: "green",
    description: "پرداخت توسط درگاه تأیید شده است.",
  },
  FAILED: {
    label: "پرداخت ناموفق",
    tone: "red",
    description: "درگاه پرداخت را تأیید نکرده است.",
  },
  REFUNDED: {
    label: "بازپرداخت شده",
    tone: "violet",
    description: "مبلغ به مشتری بازگردانده شده است.",
  },
  OPEN: {
    label: "باز و نیازمند پاسخ",
    tone: "red",
    description: "مشتری منتظر پاسخ پشتیبانی است.",
  },
  WAITING_CUSTOMER: {
    label: "در انتظار پاسخ مشتری",
    tone: "blue",
    description: "پشتیبانی پاسخ داده و منتظر مشتری است.",
  },
  CLOSED: {
    label: "بسته شده",
    tone: "slate",
    description: "گفت‌وگو پایان یافته است.",
  },
  SENT: {
    label: "ارسال شده",
    tone: "green",
    description: "پیام با موفقیت ارسال شده است.",
  },
  QUEUED: {
    label: "در صف ارسال",
    tone: "amber",
    description: "پیام در انتظار پردازش است.",
  },
  SUSPENDED: {
    label: "تعلیق شده",
    tone: "red",
    description: "دسترسی این حساب موقتاً متوقف شده است.",
  },
  EXPIRED: {
    label: "منقضی شده",
    tone: "slate",
    description: "مهلت این مورد پایان یافته است.",
  },
  CONVERTED: {
    label: "به رزرو تبدیل شده",
    tone: "green",
    description: "زمان نگه‌داشته‌شده به رزرو قطعی تبدیل شده است.",
  },
  UNPAID: {
    label: "پرداخت نشده",
    tone: "amber",
    description: "هنوز مبلغی برای این رزرو پرداخت نشده است.",
  },
  CONSUMED: {
    label: "استفاده شده",
    tone: "green",
    description: "این مورد با موفقیت مصرف شده است.",
  },
  ACTIVE: { label: "فعال", tone: "green", description: "این مورد فعال است." },
  DRAFT: {
    label: "پیش‌نویس",
    tone: "slate",
    description: "برای کاربران منتشر نشده است.",
  },
  PUBLISHED: {
    label: "منتشر شده",
    tone: "green",
    description: "برای کاربران قابل مشاهده است.",
  },
};

export type Tone =
  "blue" | "green" | "amber" | "red" | "violet" | "cyan" | "slate";

export function statusMeta(value: unknown) {
  const key = String(value ?? "").toUpperCase();
  return (
    statusCopy[key] ?? {
      label: "وضعیت نامشخص",
      tone: "slate" as Tone,
      description: "وضعیت ثبت‌شده در سامانه",
    }
  );
}

export function sourceLabel(value: unknown) {
  return value === "ADMIN_MANUAL"
    ? "رزرو ثبت‌شده توسط مدیر"
    : "رزرو آنلاین مشتری";
}

export function paymentProviderLabel(value: unknown) {
  return (
    (
      {
        ZARINPAL: "زرین‌پال",
        TEST: "پرداخت آزمایشی",
        ZIBAL: "زیبال",
      } as Record<string, string>
    )[String(value)] ?? "درگاه پرداخت"
  );
}

export function actionLabel(value: unknown) {
  const labels: Record<string, string> = {
    MANUAL_BOOKING_CHECKOUT_CREATED: "ساخت رزرو دستی",
    BOOKING_STATUS_CHANGED: "تغییر وضعیت رزرو",
    CUSTOMER_TIER_CHANGED: "تغییر سطح مشتری",
    HERO_SAVED: "ذخیره اسلایدر",
    PROMO_SAVED: "ذخیره بنر",
    CONTENT_REMOVED: "حذف محتوای ویترین",
    MEDIA_UPLOADED: "آپلود رسانه",
    SUPPORT_TICKET_CREATED: "ایجاد تیکت پشتیبانی",
    SUPPORT_TICKET_REPLIED: "پاسخ به تیکت",
    CUSTOMER_PROFILE_UPDATED: "ویرایش پروفایل مشتری",
    VEHICLE_CREATED: "افزودن خودرو",
    VEHICLE_SET_DEFAULT: "تغییر خودروی پیش‌فرض",
    CUSTOMER_PASSWORD_CHANGED: "تغییر رمز عبور مشتری",
    ADMIN_LOGIN_FAILED: "ورود ناموفق مدیر",
    ADMIN_2FA_FAILED: "کد دومرحله‌ای نامعتبر",
    PICKUP_CODE_FAILED: "کد تحویل نامعتبر",
    CATALOG_ITEM_CREATED: "افزودن مورد کاتالوگ",
    CATALOG_ITEM_UPDATED: "ویرایش مورد کاتالوگ",
    CATALOG_ITEM_DEACTIVATED: "غیرفعال‌سازی مورد کاتالوگ",
    CATALOG_ITEM_DELETED: "حذف دائمی مورد کاتالوگ",
    SCHEDULE_RULE_SAVED: "ویرایش برنامه هفتگی",
    SCHEDULE_OVERRIDE_SAVED: "ثبت تغییر برنامه یک روز",
    SCHEDULE_OVERRIDE_REMOVED: "حذف تغییر برنامه یک روز",
    PICKUP_REMINDER_SENT: "ارسال یادآوری دریافت خودرو",
    ADMIN_BROADCAST_CREATED: "ثبت ارسال گروهی پیامک",
  };
  return labels[String(value)] ?? "رویداد ثبت‌شده در سامانه";
}

export function entityLabel(value: unknown) {
  const labels: Record<string, string> = {
    Booking: "رزرو",
    BookingCheckout: "تسویه رزرو",
    Customer: "مشتری",
    CustomerVehicle: "خودروی مشتری",
    HeroSlide: "اسلایدر",
    PromoBanner: "بنر",
    MediaAsset: "رسانه",
    SupportTicket: "تیکت پشتیبانی",
    BookingScheduleRule: "برنامه هفتگی",
    BookingScheduleOverride: "استثنای برنامه کاری",
  };
  return labels[String(value)] ?? "بخش سامانه";
}

export function money(value: unknown) {
  return `${Number(value ?? 0).toLocaleString("fa-IR")} ریال`;
}

export function dateTime(value: unknown) {
  if (!value) return "—";
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

export function shortDate(value: unknown) {
  if (!value) return "—";
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat("fa-IR", {
    month: "short",
    day: "numeric",
  }).format(parsed);
}

export function arr(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? (value as JsonRecord[]) : [];
}

export function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

export async function adminRequest<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body != null && !(init.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    cache: "no-store",
    credentials: "include",
    ...init,
    headers,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message ?? payload?.message;
    throw new Error(
      Array.isArray(message)
        ? message.join("، ")
        : (message ?? "ارتباط با سرور برقرار نشد."),
    );
  }
  return payload.data as T;
}

export function StatusBadge({
  value,
  className = "",
}: {
  value: unknown;
  className?: string;
}) {
  const status = statusMeta(value);
  const tones: Record<Tone, string> = {
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    red: "border-rose-200 bg-rose-50 text-rose-700",
    violet: "border-violet-200 bg-violet-50 text-violet-700",
    cyan: "border-cyan-200 bg-cyan-50 text-cyan-700",
    slate: "border-slate-200 bg-slate-50 text-slate-600",
  };
  return (
    <span
      title={status.description}
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black ${tones[status.tone]} ${className}`}
    >
      {status.label}
    </span>
  );
}

export function PageCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[24px] border border-slate-200/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,.055)] ${className}`}
    >
      {children}
    </section>
  );
}

export function EmptyState({
  title = "هنوز موردی ثبت نشده است",
  text = "پس از ثبت اطلاعات، موارد این بخش در همین‌جا نمایش داده می‌شوند.",
}: {
  title?: string;
  text?: string;
}) {
  return (
    <div className="grid min-h-48 place-items-center p-8 text-center">
      <div>
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
          <Clock3 size={22} />
        </div>
        <p className="mt-4 text-sm font-black text-slate-700">{title}</p>
        <p className="mx-auto mt-2 max-w-sm text-xs leading-6 text-slate-400">
          {text}
        </p>
      </div>
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="grid min-h-96 place-items-center">
      <div className="relative size-12">
        <span className="absolute inset-0 rounded-full border-4 border-slate-200" />
        <span className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-violet-600" />
      </div>
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  text,
  action,
}: {
  eyebrow?: string;
  title: string;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end gap-4">
      <div>
        <p className="text-[11px] font-black text-violet-600">{eyebrow}</p>
        <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900">
          {title}
        </h2>
        {text ? (
          <p className="mt-2 max-w-2xl text-xs leading-6 text-slate-500">
            {text}
          </p>
        ) : null}
      </div>
      {action ? <div className="mr-auto">{action}</div> : null}
    </div>
  );
}

export const chartIcon = ChartNoAxesCombined;
export const slidersIcon = SlidersHorizontal;
export const notificationIcon = BellRing;
