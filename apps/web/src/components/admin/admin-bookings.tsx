"use client";

import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  CarFront,
  Clock3,
  Copy,
  KeyRound,
  MessageSquareText,
  Play,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { showToast } from "../../lib/toast";
import { plateFromBooking } from "../../lib/booking-plate";
import { IranLicensePlateDisplay } from "../booking/iran-license-plate-display";
import {
  EmptyState,
  JsonRecord,
  PageCard,
  SectionHeading,
  StatusBadge,
  adminRequest,
  arr,
  dateTime,
  money,
  record,
  sourceLabel,
  statusMeta,
} from "./admin-core";

export function BookingsView({
  rows,
  token,
  refresh,
}: {
  rows: JsonRecord[];
  token: string;
  refresh: () => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [source, setSource] = useState("ALL");
  const [selected, setSelected] = useState<JsonRecord | null>(null);
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  useEffect(() => {
    const initial = window.setTimeout(() => setCurrentTime(Date.now()), 0);
    const interval = window.setInterval(
      () => setCurrentTime(Date.now()),
      60_000,
    );
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, []);
  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        const haystack = JSON.stringify(row).toLowerCase();
        return (
          (status === "ALL" || row.status === status) &&
          (source === "ALL" || row.source === source) &&
          haystack.includes(query.trim().toLowerCase())
        );
      }),
    [query, rows, source, status],
  );

  async function transition(
    row: JsonRecord,
    nextStatus: string,
    reason: string,
  ) {
    try {
      await adminRequest(`/admin/bookings/${String(row.id)}/status`, token, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus, reason }),
      });
      showToast(
        `وضعیت رزرو به «${statusMeta(nextStatus).label}» تغییر کرد.`,
        "success",
      );
      setSelected(null);
      refresh();
    } catch (cause) {
      showToast(
        cause instanceof Error ? cause.message : "تغییر وضعیت انجام نشد.",
        "error",
      );
    }
  }

  async function verifyPickup(row: JsonRecord, code: string) {
    try {
      await adminRequest("/admin/pickup/verify", token, {
        method: "POST",
        body: JSON.stringify({ bookingId: row.id, code }),
      });
      showToast("کد صحیح بود و تحویل خودرو ثبت شد.", "success");
      setSelected(null);
      refresh();
    } catch (cause) {
      showToast(
        cause instanceof Error ? cause.message : "تأیید تحویل انجام نشد.",
        "error",
      );
    }
  }

  async function pickupReminder(row: JsonRecord) {
    try {
      await adminRequest(
        `/admin/bookings/${String(row.id)}/pickup-reminder`,
        token,
        {
          method: "POST",
          body: JSON.stringify({
            message:
              "خودروی شما آماده تحویل است. لطفاً برای دریافت خودرو به مجموعه مراجعه کنید.",
          }),
        },
      );
      showToast("یادآوری فقط برای مالک خودرو ارسال شد.", "success");
    } catch (cause) {
      showToast(
        cause instanceof Error ? cause.message : "ارسال یادآوری انجام نشد.",
        "error",
      );
    }
  }

  return (
    <div className="space-y-5">
      <SectionHeading
        eyebrow="گردش عملیات"
        title="رزروها"
        text="هر رزرو را از بررسی اولیه تا تحویل امن خودرو در یک مسیر روشن و مرحله‌به‌مرحله مدیریت کنید."
      />
      <PageCard className="p-3">
        <div className="grid gap-2 md:grid-cols-[1fr_220px_220px]">
          <label className="flex min-h-12 items-center gap-2 rounded-2xl bg-slate-50 px-4">
            <Search size={18} className="text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full bg-transparent text-xs outline-none"
              placeholder="جست‌وجوی کد رزرو، نام، موبایل یا خودرو"
            />
          </label>
          <Select value={status} onChange={setStatus}>
            <option value="ALL">همه وضعیت‌ها</option>
            <option value="UNDER_REVIEW">در انتظار تأیید مدیر</option>
            <option value="CONFIRMED">تأیید شده</option>
            <option value="CHECKED_IN">زمان مراجعه</option>
            <option value="IN_PROGRESS">در حال انجام</option>
            <option value="READY_FOR_PICKUP">آماده تحویل</option>
            <option value="COMPLETED">تکمیل شده</option>
            <option value="ADMIN_REJECTED">رد و بازپرداخت</option>
          </Select>
          <Select value={source} onChange={setSource}>
            <option value="ALL">همه روش‌های ثبت</option>
            <option value="CUSTOMER_APP">رزرو آنلاین مشتری</option>
            <option value="ADMIN_MANUAL">رزرو دستی مدیر</option>
          </Select>
        </div>
      </PageCard>
      <div className="space-y-3">
        {filtered.map((row) => (
          <BookingCard
            key={String(row.id)}
            row={row}
            currentTime={currentTime}
            onOpen={() => setSelected(row)}
            onTransition={transition}
          />
        ))}
        {!filtered.length ? (
          <PageCard>
            <EmptyState title="رزروی با این فیلتر پیدا نشد" />
          </PageCard>
        ) : null}
      </div>
      {selected ? (
        <BookingModal
          row={selected}
          onClose={() => setSelected(null)}
          onTransition={transition}
          onVerify={verifyPickup}
          onReminder={pickupReminder}
        />
      ) : null}
    </div>
  );
}

function BookingCard({
  row,
  currentTime,
  onOpen,
  onTransition,
}: {
  row: JsonRecord;
  currentTime: number | null;
  onOpen: () => void;
  onTransition: (
    row: JsonRecord,
    status: string,
    reason: string,
  ) => Promise<void>;
}) {
  const customer = record(row.customer);
  const vehicleClass = record(row.vehicleClass);
  const upcomingLabel = visitLabel(row, currentTime);
  return (
    <PageCard className="overflow-hidden">
      <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[1.4fr_1fr_1fr_auto] xl:items-center">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-violet-50 text-violet-600">
            <CarFront size={20} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <b dir="ltr" className="text-sm">
                {String(row.code)}
              </b>
              <StatusBadge value={row.status} />
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-500">
                {sourceLabel(row.source)}
              </span>
            </div>
            <p className="mt-2 truncate text-xs font-bold text-slate-700">
              {String(row.brandName ?? "")} {String(row.modelName ?? "خودرو")} ·{" "}
              {String(row.color ?? "")}
            </p>
            <p className="mt-1 text-[10px] text-slate-400">
              {String(vehicleClass.nameFa ?? "")}
            </p>
            <div className="mt-2">
              <IranLicensePlateDisplay
                plate={plateFromBooking(row)}
                size="small"
              />
            </div>
          </div>
        </div>
        <div>
          <p className="text-[10px] text-slate-400">مشتری</p>
          <b className="mt-1 block text-xs">
            {`${String(customer.firstName ?? "")} ${String(customer.lastName ?? "")}`.trim() ||
              "پروفایل تکمیل‌نشده"}
          </b>
          <small
            dir="ltr"
            className="mt-1 block text-left text-[10px] text-slate-400"
          >
            {String(customer.mobile ?? "—")}
          </small>
        </div>
        <div>
          <p className="text-[10px] text-slate-400">زمان مراجعه</p>
          <b className="mt-1 block text-xs">{dateTime(row.startsAt)}</b>
          <small
            className={`mt-1 block text-[10px] font-bold ${upcomingLabel.tone}`}
          >
            {upcomingLabel.label}
          </small>
        </div>
        <div className="flex flex-wrap gap-2 xl:justify-end">
          <PrimaryAction row={row} onTransition={onTransition} />
          <button
            onClick={onOpen}
            className="flex min-h-10 items-center gap-1 rounded-xl border border-slate-200 px-3 text-[10px] font-black text-slate-600"
          >
            جزئیات و عملیات <ArrowLeft size={14} />
          </button>
        </div>
      </div>
    </PageCard>
  );
}

function PrimaryAction({
  row,
  onTransition,
}: {
  row: JsonRecord;
  onTransition: (
    row: JsonRecord,
    status: string,
    reason: string,
  ) => Promise<void>;
}) {
  if (row.status === "UNDER_REVIEW")
    return (
      <>
        <button
          onClick={() =>
            void onTransition(row, "CONFIRMED", "تأیید رزرو توسط مدیر")
          }
          className="rounded-xl bg-emerald-600 px-3 py-2 text-[10px] font-black text-white"
        >
          تأیید رزرو
        </button>
        <button
          onClick={() =>
            void onTransition(
              row,
              "ADMIN_REJECTED",
              "رد رزرو توسط مدیر و بازپرداخت کامل",
            )
          }
          className="rounded-xl bg-rose-50 px-3 py-2 text-[10px] font-black text-rose-700"
        >
          رد و بازپرداخت
        </button>
      </>
    );
  if (["CHECKED_IN", "IN_QUEUE"].includes(String(row.status)))
    return (
      <button
        onClick={() =>
          void onTransition(row, "IN_PROGRESS", "مراجعه مشتری و شروع خدمات")
        }
        className="flex items-center gap-1 rounded-xl bg-violet-600 px-3 py-2 text-[10px] font-black text-white"
      >
        <Play size={14} />
        مراجعه شد؛ شروع خدمت
      </button>
    );
  if (row.status === "IN_PROGRESS")
    return (
      <button
        onClick={() =>
          void onTransition(
            row,
            "READY_FOR_PICKUP",
            "خدمات تکمیل و کد تحویل ارسال شد",
          )
        }
        className="flex items-center gap-1 rounded-xl bg-cyan-600 px-3 py-2 text-[10px] font-black text-white"
      >
        <Send size={14} />
        ارسال کد تحویل
      </button>
    );
  if (row.status === "DELIVERED")
    return (
      <button
        onClick={() =>
          void onTransition(row, "COMPLETED", "پایان کامل چرخه رزرو")
        }
        className="rounded-xl bg-emerald-600 px-3 py-2 text-[10px] font-black text-white"
      >
        تکمیل نهایی رزرو
      </button>
    );
  return null;
}

function BookingModal({
  row,
  onClose,
  onTransition,
  onVerify,
  onReminder,
}: {
  row: JsonRecord;
  onClose: () => void;
  onTransition: (
    row: JsonRecord,
    status: string,
    reason: string,
  ) => Promise<void>;
  onVerify: (row: JsonRecord, code: string) => Promise<void>;
  onReminder: (row: JsonRecord) => Promise<void>;
}) {
  const [code, setCode] = useState("");
  const customer = record(row.customer);
  const payments = arr(row.payments);
  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-slate-950/65 p-3 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section className="my-auto w-full max-w-3xl overflow-hidden rounded-[30px] bg-white shadow-2xl">
        <div className="relative bg-[#0c0e1d] p-6 text-white">
          <button
            onClick={onClose}
            className="absolute left-4 top-4 rounded-xl p-2 text-slate-400 hover:bg-white/10"
          >
            <X size={19} />
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-violet-600">
              <CarFront />
            </span>
            <div>
              <p className="text-[10px] text-violet-300">پرونده رزرو</p>
              <h2 dir="ltr" className="mt-1 text-left text-xl font-black">
                {String(row.code)}
              </h2>
            </div>
            <StatusBadge value={row.status} className="mr-auto" />
          </div>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Detail
            icon={UserRound}
            label="مشتری"
            value={
              `${String(customer.firstName ?? "")} ${String(customer.lastName ?? "")}`.trim() ||
              String(customer.mobile ?? "مشتری")
            }
          />
          <Detail
            icon={CalendarDays}
            label="زمان مراجعه"
            value={dateTime(row.startsAt)}
          />
          <Detail
            icon={CarFront}
            label="خودرو"
            value={`${String(row.brandName ?? "")} ${String(row.modelName ?? "")} - ${String(row.color ?? "")}`}
          />
          <Detail
            icon={Banknote}
            label="مبلغ رزرو"
            value={money(row.totalAmountRial)}
          />
          <Detail
            icon={ShieldCheck}
            label="تحویل‌گیرنده"
            value={
              row.pickupMode === "DELEGATE"
                ? "شخص معرفی‌شده توسط مالک"
                : "مالک خودرو"
            }
          />
          <Detail
            icon={MessageSquareText}
            label="روش ثبت"
            value={sourceLabel(row.source)}
          />
        </div>
        <div className="border-t border-slate-100 p-5">
          <h3 className="mb-3 text-sm font-black">اقدام بعدی</h3>
          <div className="flex flex-wrap gap-2">
            <PrimaryAction row={row} onTransition={onTransition} />
            {row.status === "READY_FOR_PICKUP" ? (
              <>
                <div className="flex min-w-64 flex-1 items-center gap-2 rounded-2xl border border-slate-200 p-2">
                  <KeyRound size={18} className="mr-2 text-violet-600" />
                  <input
                    dir="ltr"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(event) =>
                      setCode(event.target.value.replace(/\D/g, ""))
                    }
                    placeholder="کد ۶ رقمی تحویل"
                    className="min-w-0 flex-1 text-left text-sm font-black tracking-[.2em] outline-none"
                  />
                  <button
                    disabled={code.length !== 6}
                    onClick={() => void onVerify(row, code)}
                    className="min-h-10 rounded-xl bg-emerald-600 px-3 text-[10px] font-black text-white disabled:opacity-40"
                  >
                    تحویل داده شد
                  </button>
                </div>
                <button
                  onClick={() => void onReminder(row)}
                  className="flex min-h-12 items-center gap-2 rounded-2xl bg-amber-50 px-4 text-[10px] font-black text-amber-800"
                >
                  <Send size={15} />
                  هنوز تحویل نگرفته؛ یادآوری به مالک
                </button>
              </>
            ) : null}
          </div>
          {row.status === "READY_FOR_PICKUP" ? (
            <p className="mt-3 text-[10px] leading-6 text-slate-400">
              برای تحویل امن، کد شش‌رقمی پیامک‌شده به مالک یا تحویل‌گیرنده را
              وارد کنید. یادآوری عدم مراجعه همیشه فقط برای مالک ارسال می‌شود.
            </p>
          ) : null}
        </div>
        <div className="border-t border-slate-100 bg-slate-50 p-5">
          <p className="text-[10px] font-black text-slate-500">وضعیت پرداخت</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {payments.length ? (
              payments.map((payment) => (
                <span
                  key={String(payment.status)}
                  className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-[10px]"
                >
                  <StatusBadge value={payment.status} />
                  {money(
                    Number(payment.gatewayAmountRial ?? 0) +
                      Number(payment.walletAmountRial ?? 0),
                  )}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-400">
                اطلاعات پرداختی ثبت نشده است.
              </span>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CarFront;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl bg-slate-50 p-4">
      <Icon size={18} className="shrink-0 text-violet-600" />
      <div>
        <p className="text-[10px] text-slate-400">{label}</p>
        <b className="mt-1 block text-xs leading-6 text-slate-700">{value}</b>
      </div>
    </div>
  );
}

function visitLabel(row: JsonRecord, currentTime: number | null) {
  const startsAt = new Date(String(row.startsAt)).getTime();
  const diff =
    currentTime === null ? Number.POSITIVE_INFINITY : startsAt - currentTime;
  if (row.status === "CONFIRMED" && diff > 0 && diff <= 30 * 60_000)
    return { label: "زمان مراجعه نزدیک است", tone: "text-amber-600" };
  if (row.status === "CHECKED_IN")
    return {
      label: "زمان مراجعه رسیده؛ پذیرش را ثبت کنید",
      tone: "text-rose-600",
    };
  if (diff > 0) return { label: "زمان‌بندی‌شده", tone: "text-slate-400" };
  return { label: statusMeta(row.status).label, tone: "text-violet-600" };
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="min-h-12 rounded-2xl border-0 bg-slate-50 px-4 text-xs font-bold outline-none ring-violet-100 focus:ring-4"
    >
      {children}
    </select>
  );
}

export function ManualBookingView({
  token,
  navigate,
}: {
  token: string;
  navigate: (path: string) => void;
}) {
  const [packages, setPackages] = useState<JsonRecord[]>([]);
  const [brands, setBrands] = useState<JsonRecord[]>([]);
  const [models, setModels] = useState<JsonRecord[]>([]);
  const [brandId, setBrandId] = useState("");
  const [modelId, setModelId] = useState("");
  const [packageId, setPackageId] = useState("");
  const [days, setDays] = useState<JsonRecord[]>([]);
  const [slots, setSlots] = useState<JsonRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [startAt, setStartAt] = useState("");
  const [pickupMode, setPickupMode] = useState<"OWNER" | "DELEGATE">("OWNER");
  const [busy, setBusy] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState("");
  const selectedModel = models.find((item) => item.id === modelId);
  const selectedPackage = packages.find((item) => item.id === packageId);
  const vehicleClassId = String(
    record(selectedModel?.vehicleClass).id ??
      selectedModel?.vehicleClassId ??
      "",
  );
  const duration = Number(selectedPackage?.durationMinutes ?? 30);

  useEffect(() => {
    void Promise.all([
      adminRequest<JsonRecord[]>("/admin/catalog/packages", token),
      adminRequest<JsonRecord[]>("/admin/catalog/vehicle-brands", token),
      adminRequest<JsonRecord[]>("/admin/catalog/vehicle-models", token),
    ])
      .then(([packagesResult, brandsResult, modelsResult]) => {
        setPackages(packagesResult);
        setBrands(brandsResult);
        setModels(modelsResult);
      })
      .catch((cause) =>
        showToast(
          cause instanceof Error ? cause.message : "دریافت کاتالوگ ناموفق بود.",
          "error",
        ),
      );
  }, [token]);

  useEffect(() => {
    if (!packageId) return;
    void adminRequest<JsonRecord>(
      `/availability/days?durationMinutes=${duration}&days=14`,
      token,
    )
      .then((result) => setDays(arr(result.days)))
      .catch(() => setDays([]));
  }, [duration, packageId, token]);
  async function chooseDate(date: string) {
    setSelectedDate(date);
    setStartAt("");
    const result = await adminRequest<JsonRecord>(
      `/availability/slots?date=${date}&durationMinutes=${duration}`,
      token,
    );
    setSlots(arr(result.slots));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!vehicleClassId || !startAt)
      return showToast(
        "خودرو، تاریخ و ساعت مراجعه را کامل انتخاب کنید.",
        "error",
      );
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const result = await adminRequest<{ checkout: JsonRecord }>(
        "/admin/bookings/manual",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            mobile: form.get("mobile"),
            vehicleClassId,
            packageId,
            addonIds: [],
            startAt,
            pickupMode,
            ...(pickupMode === "DELEGATE"
              ? {
                  delegate: {
                    fullName: form.get("delegateName"),
                    mobile: form.get("delegateMobile"),
                  },
                }
              : {}),
            vehicle: {
              sourceMode: "CATALOG",
              modelId,
              color: form.get("color"),
              plate: {
                type: "IRAN_CAR",
                firstTwo: form.get("plateFirstTwo"),
                letter: form.get("plateLetter"),
                middleThree: form.get("plateMiddleThree"),
                iranCode: form.get("plateIranCode"),
              },
            },
          }),
        },
      );
      const payment = await adminRequest<JsonRecord>(
        `/admin/bookings/manual/${String(result.checkout.token)}/payment`,
        token,
        {
          method: "POST",
          body: JSON.stringify({
            idempotencyKey: `admin-${crypto.randomUUID()}`,
          }),
        },
      );
      setPaymentUrl(String(payment.redirectUrl ?? ""));
      showToast(
        "رزرو ساخته و لینک پرداخت برای مشتری در صف پیامک قرار گرفت.",
        "success",
      );
    } catch (cause) {
      showToast(
        cause instanceof Error ? cause.message : "ثبت رزرو دستی انجام نشد.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <SectionHeading
        eyebrow="رزرو تلفنی یا حضوری"
        title="ثبت رزرو دستی"
        text="اطلاعات را مانند مسیر رزرو مشتری انتخاب کنید. کلاس خودرو از مدل انتخاب‌شده تعیین می‌شود و رزرو پس از پرداخت، خودکار تأیید خواهد شد."
      />
      <form onSubmit={submit} className="grid gap-5 xl:grid-cols-[1fr_.9fr]">
        <div className="space-y-5">
          <PageCard className="p-5">
            <FormSection icon={UserRound} title="مشتری و خودرو">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  name="mobile"
                  label="شماره موبایل مشتری"
                  placeholder="09121234567"
                  inputMode="tel"
                  required
                />
                <label className="grid gap-2 text-xs font-black">
                  برند خودرو
                  <select
                    value={brandId}
                    onChange={(event) => {
                      setBrandId(event.target.value);
                      setModelId("");
                    }}
                    required
                    className="admin-input"
                  >
                    <option value="">برند را انتخاب کنید</option>
                    {brands.map((item) => (
                      <option key={String(item.id)} value={String(item.id)}>
                        {String(item.nameFa)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-xs font-black">
                  مدل خودرو
                  <select
                    value={modelId}
                    onChange={(event) => setModelId(event.target.value)}
                    required
                    disabled={!brandId}
                    className="admin-input"
                  >
                    <option value="">مدل را انتخاب کنید</option>
                    {models
                      .filter(
                        (item) =>
                          String(record(item.brand).id ?? item.brandId) ===
                          brandId,
                      )
                      .map((item) => (
                        <option key={String(item.id)} value={String(item.id)}>
                          {String(item.nameFa)}
                        </option>
                      ))}
                  </select>
                </label>
                <div className="rounded-2xl bg-violet-50 p-4">
                  <p className="text-[10px] text-violet-500">
                    کلاس خودرو (خودکار)
                  </p>
                  <b className="mt-1 block text-xs text-violet-900">
                    {String(
                      record(selectedModel?.vehicleClass).nameFa ??
                        "پس از انتخاب مدل نمایش داده می‌شود",
                    )}
                  </b>
                </div>
                <Field
                  name="color"
                  label="رنگ خودرو"
                  placeholder="مثلاً سفید"
                  required
                />
              </div>
            </FormSection>
          </PageCard>
          <PageCard className="p-5">
            <FormSection icon={ShieldCheck} title="پلاک ملی ایران">
              <IranPlate />
            </FormSection>
          </PageCard>
          <PageCard className="p-5">
            <FormSection icon={UserRound} title="تحویل‌گیرنده">
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setPickupMode("OWNER")}
                  className={`min-h-12 rounded-2xl border text-xs font-black ${pickupMode === "OWNER" ? "border-violet-400 bg-violet-50 text-violet-700" : "border-slate-200"}`}
                >
                  تحویل توسط مالک
                </button>
                <button
                  type="button"
                  onClick={() => setPickupMode("DELEGATE")}
                  className={`min-h-12 rounded-2xl border text-xs font-black ${pickupMode === "DELEGATE" ? "border-violet-400 bg-violet-50 text-violet-700" : "border-slate-200"}`}
                >
                  تحویل توسط شخص دیگر
                </button>
              </div>
              {pickupMode === "DELEGATE" ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field
                    name="delegateName"
                    label="نام و نام خانوادگی تحویل‌گیرنده"
                    required
                  />
                  <Field
                    name="delegateMobile"
                    label="موبایل تحویل‌گیرنده"
                    required
                  />
                </div>
              ) : null}
            </FormSection>
          </PageCard>
        </div>
        <div className="space-y-5">
          <PageCard className="p-5">
            <FormSection icon={Sparkles} title="بسته خدمات">
              <label className="grid gap-2 text-xs font-black">
                پکیج موردنظر
                <select
                  value={packageId}
                  onChange={(event) => {
                    setPackageId(event.target.value);
                    setSelectedDate("");
                    setStartAt("");
                  }}
                  required
                  className="admin-input"
                >
                  <option value="">انتخاب پکیج</option>
                  {packages.map((item) => (
                    <option key={String(item.id)} value={String(item.id)}>
                      {String(item.nameFa)} ·{" "}
                      {Number(item.durationMinutes).toLocaleString("fa-IR")}{" "}
                      دقیقه
                    </option>
                  ))}
                </select>
              </label>
            </FormSection>
          </PageCard>
          <PageCard className="p-5">
            <FormSection icon={CalendarDays} title="تاریخ مراجعه">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {days.map((day) => (
                  <button
                    type="button"
                    key={String(day.date)}
                    disabled={!day.isOpen || Number(day.availableSlots) === 0}
                    onClick={() => void chooseDate(String(day.date))}
                    className={`min-h-20 rounded-2xl border p-2 text-center transition disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300 ${selectedDate === day.date ? "border-violet-500 bg-violet-50 text-violet-700" : "border-slate-200"}`}
                  >
                    <b className="block text-[11px]">
                      {new Intl.DateTimeFormat("fa-IR", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      }).format(new Date(`${String(day.date)}T12:00:00`))}
                    </b>
                    <small className="mt-2 block text-[9px]">
                      {day.isOpen
                        ? `${Number(day.availableSlots).toLocaleString("fa-IR")} زمان آزاد`
                        : String(day.reason ?? "تعطیل")}
                    </small>
                  </button>
                ))}
              </div>
            </FormSection>
          </PageCard>
          <PageCard className="p-5">
            <FormSection icon={Clock3} title="ساعت مراجعه">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots
                  .filter((slot) => slot.isAvailable)
                  .map((slot) => (
                    <button
                      type="button"
                      key={String(slot.startAt)}
                      onClick={() => setStartAt(String(slot.startAt))}
                      className={`min-h-11 rounded-xl border text-xs font-black ${startAt === slot.startAt ? "border-violet-500 bg-violet-600 text-white" : "border-slate-200 bg-white"}`}
                    >
                      {String(slot.localTime)}
                    </button>
                  ))}
              </div>
              {selectedDate && !slots.some((slot) => slot.isAvailable) ? (
                <p className="text-xs text-rose-600">
                  در این روز زمان آزادی وجود ندارد.
                </p>
              ) : null}
            </FormSection>
          </PageCard>
          <button
            disabled={busy || !startAt || !modelId || !packageId}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-[20px] bg-gradient-to-l from-violet-600 to-indigo-700 text-sm font-black text-white shadow-lg shadow-violet-600/20 disabled:opacity-40"
          >
            <Banknote size={19} />
            {busy ? "در حال ساخت رزرو..." : "ثبت رزرو و ارسال لینک پرداخت"}
          </button>
          {paymentUrl ? (
            <PageCard className="border-emerald-200 bg-emerald-50 p-5">
              <p className="text-sm font-black text-emerald-800">
                لینک پرداخت ساخته و پیامک شد
              </p>
              <a
                href={paymentUrl}
                target="_blank"
                dir="ltr"
                className="mt-3 block break-all text-left text-xs text-emerald-700 underline"
              >
                {paymentUrl}
              </a>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(paymentUrl)
                      .then(() => showToast("لینک کپی شد.", "success"))
                  }
                  className="flex min-h-10 items-center gap-2 rounded-xl bg-white px-3 text-[10px] font-black text-emerald-700"
                >
                  <Copy size={14} />
                  کپی لینک
                </button>
                <button
                  type="button"
                  onClick={() => navigate("bookings")}
                  className="flex min-h-10 items-center gap-2 rounded-xl bg-emerald-700 px-3 text-[10px] font-black text-white"
                >
                  مشاهده رزروها <ArrowLeft size={14} />
                </button>
              </div>
            </PageCard>
          ) : null}
        </div>
      </form>
    </div>
  );
}

function FormSection({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof UserRound;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-xl bg-violet-50 text-violet-600">
          <Icon size={17} />
        </span>
        <h3 className="text-sm font-black">{title}</h3>
      </div>
      {children}
    </div>
  );
}
function Field(
  props: React.InputHTMLAttributes<HTMLInputElement> & { label: string },
) {
  const { label, ...input } = props;
  return (
    <label className="grid gap-2 text-xs font-black">
      <span>{label}</span>
      <input {...input} className="admin-input" />
    </label>
  );
}
function IranPlate() {
  return (
    <div
      className="overflow-hidden rounded-[18px] border-2 border-slate-800 bg-white"
      dir="ltr"
    >
      <div className="grid grid-cols-[64px_1fr_.7fr_1.15fr_.8fr] sm:grid-cols-[78px_1fr_.7fr_1.3fr_.9fr]">
        <div className="grid min-h-24 place-items-center bg-blue-700 px-2 text-center text-white">
          <span className="text-[8px] font-black">
            I.R.
            <br />
            IRAN
          </span>
        </div>
        <label className="grid place-items-center border-r border-slate-300">
          <span className="sr-only">دو رقم اول پلاک</span>
          <input
            name="plateFirstTwo"
            inputMode="numeric"
            maxLength={2}
            pattern="[0-9]{2}"
            required
            className="w-full bg-transparent text-center text-xl font-black outline-none"
            placeholder="۱۲"
          />
        </label>
        <label className="grid place-items-center border-r border-slate-300">
          <span className="sr-only">حرف پلاک</span>
          <select
            name="plateLetter"
            required
            className="h-full w-full bg-transparent text-center text-lg font-black outline-none"
          >
            <option value="">حرف</option>
            {[
              "ب",
              "ج",
              "د",
              "س",
              "ص",
              "ط",
              "ق",
              "ل",
              "م",
              "ن",
              "و",
              "ه",
              "ی",
            ].map((letter) => (
              <option key={letter}>{letter}</option>
            ))}
          </select>
        </label>
        <label className="grid place-items-center border-r border-slate-300">
          <span className="sr-only">سه رقم میانی پلاک</span>
          <input
            name="plateMiddleThree"
            inputMode="numeric"
            maxLength={3}
            pattern="[0-9]{3}"
            required
            className="w-full bg-transparent text-center text-xl font-black outline-none"
            placeholder="۳۴۵"
          />
        </label>
        <label className="grid place-items-center">
          <span className="text-[9px] font-bold text-slate-500">ایران</span>
          <input
            name="plateIranCode"
            inputMode="numeric"
            maxLength={2}
            pattern="[0-9]{2}"
            required
            className="w-full bg-transparent text-center text-xl font-black outline-none"
            placeholder="۲۲"
          />
        </label>
      </div>
    </div>
  );
}
