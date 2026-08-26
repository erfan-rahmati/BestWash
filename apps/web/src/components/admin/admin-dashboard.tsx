"use client";

import {
  ArrowLeft,
  CalendarCheck2,
  CarFront,
  Check,
  CircleDollarSign,
  Clock3,
  Headphones,
  MessageSquareText,
  Sparkles,
  TrendingUp,
  UserRoundPlus,
  X,
} from "lucide-react";
import { showToast } from "../../lib/toast";
import {
  JsonRecord,
  PageCard,
  SectionHeading,
  StatusBadge,
  adminRequest,
  arr,
  dateTime,
  money,
  record,
  shortDate,
  sourceLabel,
} from "./admin-core";

export function AdminDashboard({
  data,
  token,
  refresh,
  navigate,
}: {
  data: JsonRecord;
  token: string;
  refresh: () => void;
  navigate: (path: string) => void;
}) {
  const pending = arr(data.pendingReview);
  const payments = arr(data.recentPayments);
  const tickets = arr(data.openTickets);
  const revenue = arr(data.revenueByDay);
  const statusGroups = arr(data.statusGroups);

  async function review(id: string, status: "CONFIRMED" | "ADMIN_REJECTED") {
    try {
      await adminRequest(`/admin/bookings/${id}/status`, token, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          reason:
            status === "CONFIRMED"
              ? "تأیید رزرو از داشبورد مدیریت"
              : "رد رزرو توسط مدیر و بازپرداخت کامل",
        }),
      });
      showToast(
        status === "CONFIRMED" ? "رزرو تأیید شد." : "رزرو رد و بازپرداخت شد.",
        "success",
      );
      refresh();
    } catch (cause) {
      showToast(
        cause instanceof Error ? cause.message : "عملیات انجام نشد.",
        "error",
      );
    }
  }

  const cards = [
    {
      label: "رزروهای امروز",
      value: Number(data.todayBookings ?? 0).toLocaleString("fa-IR"),
      sub: "مراجعه‌های برنامه‌ریزی‌شده",
      icon: CalendarCheck2,
      color: "from-violet-500 to-indigo-600",
    },
    {
      label: "در انتظار تأیید",
      value: pending.length.toLocaleString("fa-IR"),
      sub: "نیازمند اقدام مدیر",
      icon: Clock3,
      color: "from-amber-400 to-orange-500",
    },
    {
      label: "در حال انجام",
      value: Number(data.inProgress ?? 0).toLocaleString("fa-IR"),
      sub: "خودروهای داخل مجموعه",
      icon: CarFront,
      color: "from-cyan-500 to-blue-600",
    },
    {
      label: "آماده تحویل",
      value: Number(data.ready ?? 0).toLocaleString("fa-IR"),
      sub: "منتظر دریافت مشتری",
      icon: Sparkles,
      color: "from-emerald-400 to-teal-600",
    },
    {
      label: "مشتری جدید",
      value: Number(data.newCustomers ?? 0).toLocaleString("fa-IR"),
      sub: "عضویت‌های امروز",
      icon: UserRoundPlus,
      color: "from-fuchsia-500 to-violet-600",
    },
    {
      label: "درآمد امروز",
      value: money(data.revenueRial),
      sub: "پرداخت‌های تأییدشده",
      icon: CircleDollarSign,
      color: "from-slate-700 to-slate-950",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[30px] bg-[#0c0e1d] p-6 text-white shadow-[0_28px_80px_rgba(15,23,42,.18)] sm:p-8">
        <div className="pointer-events-none absolute -left-16 -top-20 size-64 rounded-full bg-violet-600/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 right-1/3 size-56 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="relative flex flex-wrap items-end gap-5">
          <div>
            <p className="text-xs font-black text-violet-300">
              خوش آمدید؛ همه‌چیز زیر کنترل است
            </p>
            <h2 className="mt-2 text-2xl font-black sm:text-3xl">
              امروز در BestWash چه می‌گذرد؟
            </h2>
            <p className="mt-3 max-w-2xl text-xs leading-7 text-slate-300">
              موارد مهم برای اقدام فوری، بدون جست‌وجو بین صفحات در دسترس شماست.
            </p>
          </div>
          <div className="mr-auto flex flex-wrap gap-2">
            <QuickButton onClick={() => navigate("manual")} icon={CarFront}>
              رزرو دستی
            </QuickButton>
            <QuickButton
              onClick={() => navigate("bookings")}
              icon={CalendarCheck2}
            >
              مدیریت رزرو
            </QuickButton>
            <QuickButton onClick={() => navigate("support")} icon={Headphones}>
              پشتیبانی
            </QuickButton>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <PageCard key={card.label} className="group overflow-hidden p-5">
            <div className="flex items-center gap-4">
              <span
                className={`grid size-12 place-items-center rounded-2xl bg-gradient-to-br ${card.color} text-white shadow-lg transition group-hover:-translate-y-1`}
              >
                <card.icon size={21} />
              </span>
              <div>
                <p className="text-xs text-slate-500">{card.label}</p>
                <strong className="mt-1 block text-xl font-black tracking-tight">
                  {card.value}
                </strong>
                <small className="mt-1 block text-[9px] text-slate-400">
                  {card.sub}
                </small>
              </div>
            </div>
          </PageCard>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
        <PageCard className="p-5 sm:p-6">
          <SectionHeading
            eyebrow="هفت روز اخیر"
            title="روند درآمد"
            text="مجموع پرداخت‌های موفق هر روز؛ داده‌ها مستقیماً از تراکنش‌های تأییدشده خوانده می‌شوند."
            action={
              <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-3 py-2 text-[10px] font-black text-emerald-700">
                <TrendingUp size={15} />
                درآمد کل {money(data.totalRevenueRial)}
              </div>
            }
          />
          <RevenueChart rows={revenue} />
        </PageCard>
        <PageCard className="p-5 sm:p-6">
          <SectionHeading
            eyebrow="تصویر کلی"
            title="ترکیب وضعیت رزروها"
            text="تعداد رزروها در هر مرحله عملیاتی"
          />
          <StatusDonut rows={statusGroups} />
        </PageCard>
      </div>

      <PageCard className="overflow-hidden">
        <div className="p-5 sm:p-6">
          <SectionHeading
            eyebrow="نیازمند اقدام"
            title="رزروهای در انتظار تأیید"
            text="بدون خروج از داشبورد رزرو را تأیید کنید یا با بازپرداخت کامل رد کنید."
            action={
              <button
                onClick={() => navigate("bookings")}
                className="flex items-center gap-2 text-xs font-black text-violet-700"
              >
                مشاهده همه <ArrowLeft size={16} />
              </button>
            }
          />
        </div>
        <div className="divide-y divide-slate-100">
          {pending.map((booking) => {
            const customer = record(booking.customer);
            return (
              <div
                key={String(booking.id)}
                className="grid gap-4 p-5 transition hover:bg-slate-50 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-violet-50 text-violet-600">
                    <CalendarCheck2 size={18} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <b className="text-sm">{String(booking.code)}</b>
                      <StatusBadge value={booking.status} />
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-500">
                        {sourceLabel(booking.source)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-600">
                      {`${String(customer.firstName ?? "")} ${String(customer.lastName ?? "")}`.trim() ||
                        "مشتری تکمیل‌نشده"}{" "}
                      · <span dir="ltr">{String(customer.mobile ?? "—")}</span>
                    </p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      زمان مراجعه: {dateTime(booking.startsAt)} ·{" "}
                      {money(booking.totalAmountRial)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => void review(String(booking.id), "CONFIRMED")}
                    className="flex min-h-10 items-center justify-center gap-1 rounded-xl bg-emerald-600 px-4 text-[11px] font-black text-white"
                  >
                    <Check size={15} />
                    تأیید
                  </button>
                  <button
                    onClick={() =>
                      void review(String(booking.id), "ADMIN_REJECTED")
                    }
                    className="flex min-h-10 items-center justify-center gap-1 rounded-xl bg-rose-50 px-4 text-[11px] font-black text-rose-700"
                  >
                    <X size={15} />
                    رد و بازپرداخت
                  </button>
                </div>
              </div>
            );
          })}
          {!pending.length ? (
            <p className="p-8 text-center text-xs text-emerald-600">
              رزروی در انتظار بررسی نیست؛ عالی است.
            </p>
          ) : null}
        </div>
      </PageCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <PageCard className="overflow-hidden">
          <div className="p-5">
            <SectionHeading
              eyebrow="مالی"
              title="آخرین پرداخت‌ها"
              action={
                <button
                  onClick={() => navigate("payments")}
                  className="text-[10px] font-black text-violet-700"
                >
                  همه پرداخت‌ها
                </button>
              }
            />
          </div>
          <div className="divide-y divide-slate-100">
            {payments.map((payment) => {
              const customer = record(payment.customer);
              const booking = record(payment.booking);
              return (
                <div
                  key={String(payment.id)}
                  className="flex items-center gap-3 p-4"
                >
                  <span className="grid size-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <CircleDollarSign size={18} />
                  </span>
                  <div className="min-w-0">
                    <b className="text-xs">{money(payment.amountRial)}</b>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {String(booking.code ?? "پرداخت بدون رزرو")} ·{" "}
                      {String(customer.mobile ?? "—")}
                    </p>
                  </div>
                  <div className="mr-auto text-left">
                    <StatusBadge value={payment.status} />
                    <small className="mt-1 block text-[9px] text-slate-400">
                      {dateTime(payment.requestedAt)}
                    </small>
                  </div>
                </div>
              );
            })}
          </div>
        </PageCard>
        <PageCard className="overflow-hidden">
          <div className="p-5">
            <SectionHeading
              eyebrow="ارتباط با مشتری"
              title="تیکت‌های باز"
              action={
                <button
                  onClick={() => navigate("support")}
                  className="text-[10px] font-black text-violet-700"
                >
                  مرکز پشتیبانی
                </button>
              }
            />
          </div>
          <div className="divide-y divide-slate-100">
            {tickets.map((ticket) => {
              const customer = record(ticket.customer);
              return (
                <button
                  key={String(ticket.id)}
                  onClick={() => navigate("support")}
                  className="flex w-full items-center gap-3 p-4 text-right hover:bg-slate-50"
                >
                  <span className="grid size-10 place-items-center rounded-2xl bg-amber-50 text-amber-600">
                    <MessageSquareText size={18} />
                  </span>
                  <div className="min-w-0">
                    <b className="block truncate text-xs">
                      {String(ticket.subject)}
                    </b>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {String(ticket.code)} ·{" "}
                      {String(customer.mobile ?? "مشتری")}
                    </p>
                  </div>
                  <div className="mr-auto text-left">
                    <StatusBadge value={ticket.status} />
                    <small className="mt-1 block text-[9px] text-slate-400">
                      {Number(
                        record(ticket._count).messages ?? 0,
                      ).toLocaleString("fa-IR")}{" "}
                      پیام
                    </small>
                  </div>
                </button>
              );
            })}
            {!tickets.length ? (
              <p className="p-8 text-center text-xs text-slate-400">
                تیکت بازی وجود ندارد.
              </p>
            ) : null}
          </div>
        </PageCard>
      </div>
    </div>
  );
}

function QuickButton({
  icon: Icon,
  children,
  onClick,
}: {
  icon: typeof CarFront;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex min-h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/7 px-4 text-[11px] font-black text-white backdrop-blur hover:bg-white/12"
    >
      <Icon size={16} />
      {children}
    </button>
  );
}

function RevenueChart({ rows }: { rows: JsonRecord[] }) {
  const max = Math.max(1, ...rows.map((item) => Number(item.amountRial ?? 0)));
  return (
    <div>
      <div className="flex h-56 items-end gap-2 border-b border-slate-100 px-2 pt-5 sm:gap-4">
        {rows.map((item) => {
          const amount = Number(item.amountRial ?? 0);
          const height = Math.max(5, (amount / max) * 100);
          return (
            <div
              key={String(item.date)}
              className="group flex h-full min-w-0 flex-1 flex-col justify-end"
            >
              <div className="relative mx-auto w-full max-w-12 flex-1">
                <span
                  title={money(amount)}
                  style={{ height: `${height}%` }}
                  className="absolute inset-x-0 bottom-0 rounded-t-xl bg-gradient-to-t from-violet-700 via-violet-500 to-cyan-400 shadow-[0_10px_25px_rgba(109,63,242,.18)] transition group-hover:brightness-110"
                />
                <span className="absolute -top-5 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[8px] text-white group-hover:block">
                  {money(amount)}
                </span>
              </div>
              <small className="mt-3 block truncate text-center text-[9px] text-slate-400">
                {shortDate(item.date)}
              </small>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-between text-[10px] text-slate-400">
        <span>هر ستون یک روز</span>
        <b className="text-slate-600">
          مجموع دوره:{" "}
          {money(
            rows.reduce((sum, item) => sum + Number(item.amountRial ?? 0), 0),
          )}
        </b>
      </div>
    </div>
  );
}

function StatusDonut({ rows }: { rows: JsonRecord[] }) {
  const total = Math.max(
    1,
    rows.reduce((sum, item) => sum + Number(record(item._count)._all ?? 0), 0),
  );
  const important = rows.slice(0, 6);
  const colors = [
    "#6d3ff2",
    "#06b6d4",
    "#10b981",
    "#f59e0b",
    "#f43f5e",
    "#64748b",
  ];
  const gradient = important
    .map((item, index) => {
      const count = Number(record(item._count)._all ?? 0);
      const start = important
        .slice(0, index)
        .reduce(
          (sum, previous) => sum + Number(record(previous._count)._all ?? 0),
          0,
        );
      const startPercent = (start / total) * 100;
      const endPercent = ((start + count) / total) * 100;
      return `${colors[index]} ${startPercent}% ${endPercent}%`;
    })
    .join(",");
  return (
    <div className="grid items-center gap-5 sm:grid-cols-[150px_1fr]">
      <div
        className="relative mx-auto size-36 rounded-full"
        style={{
          background: `conic-gradient(${gradient || "#e2e8f0 0 100%"})`,
        }}
      >
        <span className="absolute inset-5 grid place-items-center rounded-full bg-white text-center">
          <span>
            <b className="block text-2xl font-black">
              {total.toLocaleString("fa-IR")}
            </b>
            <small className="text-[9px] text-slate-400">کل رزروها</small>
          </span>
        </span>
      </div>
      <div className="space-y-2">
        {important.map((item, index) => (
          <div
            key={String(item.status)}
            className="flex items-center gap-2 text-[10px]"
          >
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: colors[index] }}
            />
            <StatusBadge value={item.status} />
            <b className="mr-auto">
              {Number(record(item._count)._all ?? 0).toLocaleString("fa-IR")}
            </b>
          </div>
        ))}
      </div>
    </div>
  );
}
