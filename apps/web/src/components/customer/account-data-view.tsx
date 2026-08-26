"use client";

import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  Gift,
  CheckCircle2,
  LoaderCircle,
  Sparkles,
  Star,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  getLoyalty,
  getMyBookings,
  getWallet,
  type CustomerBooking,
} from "../../lib/api/account";
import {
  bookingStatusFa,
  bookingStatusClasses,
  formatDateTime,
  formatToman,
  transactionTypeFa,
} from "../../lib/format";
import { GuestGate } from "./guest-gate";
import { IranLicensePlateDisplay } from "../booking/iran-license-plate-display";
import { plateFromBooking } from "../../lib/booking-plate";

type Kind = "bookings" | "wallet" | "loyalty";
const completedStatuses = new Set([
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
  "ADMIN_REJECTED",
]);

export function AccountDataView({ kind }: { kind: Kind }) {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"active" | "history">("active");
  const [currentTimestamp, setCurrentTimestamp] = useState(0);

  useEffect(() => {
    const updateTimestamp = () => setCurrentTimestamp(Date.now());
    const initialTimer = window.setTimeout(updateTimestamp, 0);
    const interval = window.setInterval(updateTimestamp, 60_000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    setUnauthorized(false);
    const loader =
      kind === "bookings"
        ? getMyBookings
        : kind === "wallet"
          ? getWallet
          : getLoyalty;
    loader()
      .then(setData)
      .catch((requestError) => {
        if (requestError instanceof ApiError && requestError.status === 401) {
          setUnauthorized(true);
        } else {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "دریافت اطلاعات ناموفق بود.",
          );
        }
      })
      .finally(() => setLoading(false));
  }, [kind]);

  useEffect(() => {
    queueMicrotask(load);
  }, [load]);

  if (loading)
    return (
      <div className="flex min-h-52 items-center justify-center">
        <LoaderCircle className="animate-spin text-blue-600" />
      </div>
    );
  if (unauthorized) return <GuestGate />;
  if (error)
    return (
      <div
        role="alert"
        className="rounded-[20px] border border-red-100 bg-red-50 p-5 text-[11px] leading-6 text-red-600"
      >
        {error}
      </div>
    );

  if (kind === "wallet") {
    const wallet = data as {
      balanceRial?: number;
      transactions?: Array<Record<string, unknown>>;
      creditLots?: Array<Record<string, unknown>>;
    };
    return (
      <div>
        <div className="bw-shimmer rounded-[26px] bg-[linear-gradient(135deg,#0d6de0,#29b8e8)] p-6 text-white shadow-[var(--bw-shadow-blue)]">
          <WalletCards size={24} />
          <p className="mt-5 text-[11px] text-blue-100">موجودی قابل استفاده</p>
          <p className="mt-1 text-[25px] font-black">
            {formatToman(wallet.balanceRial)}
          </p>
          <p className="mt-3 text-[10px] leading-5 text-blue-50">
            اعتبار کیف پول قابل برداشت نقدی نیست و در پرداخت رزروهای بعدی
            استفاده می‌شود.
          </p>
        </div>
        <h2 className="mt-6 text-[14px] font-black text-slate-800">
          گردش اعتبار
        </h2>
        <div className="mt-3 space-y-3">
          {(wallet.transactions ?? []).length ? (
            (wallet.transactions ?? []).map((item) => {
              const amount = Number(item.amountRial ?? 0);
              return (
                <div
                  key={String(item.id)}
                  className="flex items-center gap-3 rounded-[18px] border border-[var(--bw-border)] bg-white p-4"
                >
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-[13px] ${amount >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}
                  >
                    <WalletCards size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-black text-slate-700">
                      {transactionTypeFa[String(item.type)] ?? "تراکنش کیف پول"}
                    </p>
                    <p className="mt-1 text-[9px] text-slate-400">
                      {formatDateTime(item.createdAt)}
                    </p>
                  </div>
                  <b
                    dir="ltr"
                    className={`mr-auto text-[11px] ${amount >= 0 ? "text-emerald-600" : "text-slate-700"}`}
                  >
                    {amount >= 0 ? "+" : "−"}
                    {formatToman(Math.abs(amount))}
                  </b>
                </div>
              );
            })
          ) : (
            <Empty
              icon={WalletCards}
              text="هنوز تراکنشی در کیف پول شما ثبت نشده است."
            />
          )}
        </div>
      </div>
    );
  }

  if (kind === "loyalty") {
    const loyalty = data as {
      account?: {
        points?: number;
        tier?: { id?: string; nameFa?: string; minPoints?: number };
        transactions?: Array<Record<string, unknown>>;
      };
      tiers?: Array<{
        id: string;
        nameFa: string;
        minPoints: number;
        maxPoints: number | null;
      }>;
      rewards?: Array<{ id: string; nameFa: string; pointsCost: number }>;
      rules?: Array<{ eventName: string; points: number }>;
    };
    const account = loyalty.account ?? {};
    const points = Number(account.points ?? 0);
    const orderedTiers = [...(loyalty.tiers ?? [])].sort(
      (a, b) => a.minPoints - b.minPoints,
    );
    const currentTier = account.tier;
    const currentTierIndex = currentTier?.id
      ? orderedTiers.findIndex((item) => item.id === currentTier.id)
      : orderedTiers.reduce(
          (found, item, index) => (item.minPoints <= points ? index : found),
          0,
        );
    const nextTier = orderedTiers[currentTierIndex + 1];
    const currentFloor = Number(
      currentTier?.minPoints ?? orderedTiers[currentTierIndex]?.minPoints ?? 0,
    );
    const progress = nextTier
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(
              ((points - currentFloor) /
                Math.max(1, nextTier.minPoints - currentFloor)) *
                100,
            ),
          ),
        )
      : 100;
    const transactions = account.transactions ?? [];
    const profileReward = transactions.find(
      (item) => String(item.type) === "PROFILE_COMPLETED",
    );
    const bookingRewardPoints = Number(
      loyalty.rules?.find((item) => item.eventName === "booking.confirmed")
        ?.points ?? 30,
    );
    return (
      <div>
        <div className="rounded-[26px] border border-amber-100 bg-[linear-gradient(145deg,#fff8df,#fff)] p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-amber-100 text-amber-600">
              <Star />
            </span>
            <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-black text-amber-700">
              سطح {account.tier?.nameFa ?? "عادی"}
            </span>
          </div>
          <p className="mt-5 text-[25px] font-black text-slate-800">
            {points.toLocaleString("fa-IR")} امتیاز
          </p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-amber-100">
            <span
              className="block h-full rounded-full bg-amber-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-[10px] text-slate-500">
            {nextTier
              ? `${Math.max(0, nextTier.minPoints - points).toLocaleString("fa-IR")} امتیاز تا سطح ${nextTier.nameFa}`
              : "به بالاترین سطح باشگاه رسیده‌اید."}
          </p>
        </div>
        <div className="mt-5 grid gap-3">
          <RewardRuleCard
            title="پاداش هر رزرو تأییدشده"
            description={`برای هر رزرو تأییدشده ${bookingRewardPoints.toLocaleString("fa-IR")} امتیاز دریافت می‌کنید.`}
            completed={transactions.some((item) =>
              String(item.type).includes("BOOKING"),
            )}
          />
          <RewardRuleCard
            title="هدیه تکمیل پروفایل"
            description="با کامل‌کردن اطلاعات حساب، ۱۰ امتیاز هدیه می‌گیرید."
            completed={Boolean(profileReward)}
          />
        </div>
        <h2 className="mt-6 text-[14px] font-black">تاریخچه دریافت امتیاز</h2>
        <div className="mt-3 space-y-3">
          {transactions.length ? (
            transactions.map((item) => (
              <div
                key={String(item.id)}
                className="flex items-center gap-3 rounded-[18px] border border-[var(--bw-border)] bg-white p-4"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={18} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-black text-slate-700">
                    {String(item.description ?? "دریافت امتیاز باشگاه")}
                  </p>
                  <p className="mt-1 text-[9px] text-slate-400">
                    {formatDateTime(item.createdAt)}
                    {item.booking && typeof item.booking === "object"
                      ? ` · رزرو ${String((item.booking as Record<string, unknown>).code ?? "")}`
                      : item.bookingId
                        ? ` · رزرو ${String(item.bookingId).slice(-8)}`
                        : ""}
                  </p>
                </div>
                <b dir="ltr" className="mr-auto text-[11px] text-emerald-600">
                  +{Number(item.points ?? 0).toLocaleString("fa-IR")}
                </b>
              </div>
            ))
          ) : (
            <Empty
              icon={Sparkles}
              text="هنوز امتیازی در حساب شما ثبت نشده است."
            />
          )}
        </div>
        {(loyalty.rewards ?? []).length ? (
          <>
            <h2 className="mt-6 text-[14px] font-black">
              پاداش‌های قابل دریافت
            </h2>
            <div className="mt-3 space-y-2">
              {loyalty.rewards!.map((reward) => (
                <div
                  key={reward.id}
                  className="flex items-center rounded-[17px] border border-[var(--bw-border)] bg-white p-4"
                >
                  <Gift className="text-blue-600" size={19} />
                  <span className="mr-3 text-[11px] font-bold">
                    {reward.nameFa}
                  </span>
                  <span className="mr-auto text-[10px] font-black text-blue-700">
                    {reward.pointsCost.toLocaleString("fa-IR")} امتیاز
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>
    );
  }

  const bookings = (Array.isArray(data) ? data : []) as CustomerBooking[];
  const filtered = bookings.filter((item) => {
    const isPast = new Date(item.startsAt).getTime() < currentTimestamp;
    const isHistory = completedStatuses.has(item.status) || isPast;
    return tab === "history" ? isHistory : !isHistory;
  });
  return (
    <div>
      <div className="grid grid-cols-2 rounded-[16px] border border-[var(--bw-border)] bg-slate-50 p-1">
        <button
          onClick={() => setTab("active")}
          className={`min-h-11 rounded-[13px] text-[11px] font-black ${tab === "active" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}
        >
          فعال و پیش‌رو
        </button>
        <button
          onClick={() => setTab("history")}
          className={`min-h-11 rounded-[13px] text-[11px] font-black ${tab === "history" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}
        >
          سوابق
        </button>
      </div>
      <div className="mt-4 space-y-3">
        {filtered.length ? (
          filtered.map((item) => (
            <Link
              key={item.id}
              href={`/bookings/${item.id}`}
              className="block rounded-[22px] border border-[var(--bw-border)] bg-white p-4 shadow-sm transition active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] font-black text-slate-800">
                    {item.packageNameFa}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    {item.brandName
                      ? `${item.brandName} ${item.modelName}`
                      : item.modelName}{" "}
                    · {item.color}
                  </p>
                  <div className="mt-2">
                    <IranLicensePlateDisplay
                      plate={plateFromBooking(item)}
                      size="small"
                    />
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-[9px] font-black ${bookingStatusClasses(item.status)}`}
                >
                  {bookingStatusFa[item.status] ?? item.status}
                </span>
              </div>
              <div className="mt-4 flex items-center border-t border-dashed border-slate-200 pt-3 text-[10px] text-slate-500">
                <CalendarDays size={15} className="ml-2 text-blue-500" />
                {formatDateTime(item.startsAt)}
                <ChevronLeft className="mr-auto text-slate-400" size={17} />
              </div>
            </Link>
          ))
        ) : (
          <Empty
            icon={CalendarDays}
            text={
              tab === "active"
                ? "رزرو فعال یا پیش‌رویی ندارید."
                : "هنوز سابقه رزروی ثبت نشده است."
            }
            action
          />
        )}
      </div>
    </div>
  );
}

function RewardRuleCard({
  title,
  description,
  completed,
}: {
  title: string;
  description: string;
  completed: boolean;
}) {
  return (
    <div
      className={`rounded-[20px] border p-4 ${completed ? "border-emerald-100 bg-emerald-50" : "border-blue-100 bg-blue-50"}`}
    >
      <div className="flex items-center gap-2">
        {completed ? (
          <CheckCircle2 size={18} className="text-emerald-600" />
        ) : (
          <Sparkles size={18} className="text-blue-700" />
        )}
        <b
          className={`text-[12px] ${completed ? "text-emerald-700" : "text-blue-700"}`}
        >
          {title}
        </b>
      </div>
      <p className="mt-2 text-[10px] leading-5 text-slate-600">{description}</p>
      <p
        className={`mt-2 text-[9px] font-black ${completed ? "text-emerald-700" : "text-slate-400"}`}
      >
        {completed ? "دریافت شده" : "در انتظار انجام"}
      </p>
    </div>
  );
}

function Empty({
  icon: Icon,
  text,
  action = false,
}: {
  icon: typeof CalendarDays;
  text: string;
  action?: boolean;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--bw-border)] bg-white p-7 text-center">
      <Icon className="mx-auto text-blue-500" />
      <p className="mt-3 text-[11px] font-bold leading-6 text-slate-600">
        {text}
      </p>
      {action ? (
        <Link
          href="/booking"
          className="mt-4 inline-flex min-h-11 items-center rounded-[14px] bg-blue-600 px-5 text-[11px] font-black text-white"
        >
          ثبت رزرو جدید
        </Link>
      ) : null}
    </div>
  );
}
