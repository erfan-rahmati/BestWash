"use client";

import {
  BadgeCheck,
  CircleDollarSign,
  Crown,
  Mail,
  Phone,
  Search,
  Sparkles,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { showToast } from "../../lib/toast";
import {
  EmptyState,
  JsonRecord,
  PageCard,
  SectionHeading,
  StatusBadge,
  adminRequest,
  dateTime,
  money,
  paymentProviderLabel,
  record,
} from "./admin-core";

export function CustomersView({
  rows,
  token,
  refresh,
}: {
  rows: JsonRecord[];
  token: string;
  refresh: () => void;
}) {
  const [query, setQuery] = useState("");
  const [tiers, setTiers] = useState<JsonRecord[]>([]);
  const [selected, setSelected] = useState<JsonRecord | null>(null);
  useEffect(() => {
    void adminRequest<JsonRecord[]>("/admin/catalog/loyalty-tiers", token)
      .then(setTiers)
      .catch(() => setTiers([]));
  }, [token]);
  const filtered = useMemo(
    () =>
      rows.filter((row) =>
        JSON.stringify(row).toLowerCase().includes(query.toLowerCase()),
      ),
    [query, rows],
  );
  async function changeTier(customerId: string, tierId: string) {
    try {
      await adminRequest(`/admin/customers/${customerId}/tier`, token, {
        method: "PATCH",
        body: JSON.stringify({ tierId }),
      });
      showToast("نوع کاربری مشتری به‌روزرسانی شد.", "success");
      setSelected(null);
      refresh();
    } catch (cause) {
      showToast(
        cause instanceof Error ? cause.message : "تغییر نوع کاربری انجام نشد.",
        "error",
      );
    }
  }
  return (
    <div className="space-y-5">
      <SectionHeading
        eyebrow="باشگاه مشتریان"
        title="مشتریان"
        text="اطلاعات تماس، سابقه رزرو، امتیاز، کیف پول و نوع کاربری هر مشتری را یک‌جا ببینید."
      />
      <PageCard className="p-3">
        <label className="flex min-h-12 items-center gap-2 rounded-2xl bg-slate-50 px-4">
          <Search size={18} className="text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full bg-transparent text-xs outline-none"
            placeholder="جست‌وجوی نام، موبایل یا ایمیل مشتری"
          />
        </label>
      </PageCard>
      <PageCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-right text-xs">
            <thead className="bg-slate-50 text-[10px] text-slate-500">
              <tr>
                <Th>مشتری</Th>
                <Th>اطلاعات تماس</Th>
                <Th>تعداد رزرو</Th>
                <Th>امتیاز باشگاه</Th>
                <Th>موجودی کیف پول</Th>
                <Th>نوع کاربری</Th>
                <Th>آخرین فعالیت</Th>
                <Th>عملیات</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const loyalty = record(row.loyalty);
                const tier = record(loyalty.tier);
                return (
                  <tr
                    key={String(row.id)}
                    className="border-t border-slate-100 hover:bg-slate-50/60"
                  >
                    <Td>
                      <div className="flex items-center gap-3">
                        <span className="grid size-10 place-items-center rounded-2xl bg-violet-50 font-black text-violet-600">
                          {String(row.firstName ?? "م").slice(0, 1)}
                        </span>
                        <div>
                          <b>
                            {`${String(row.firstName ?? "")} ${String(row.lastName ?? "")}`.trim() ||
                              "پروفایل تکمیل‌نشده"}
                          </b>
                          <small className="mt-1 block text-[9px] text-slate-400">
                            شناسه {String(row.id).slice(-8)}
                          </small>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <span dir="ltr" className="block text-left">
                        {String(row.mobile)}
                      </span>
                      <small className="mt-1 block text-slate-400">
                        {String(row.email ?? "ایمیل ثبت نشده")}
                      </small>
                    </Td>
                    <Td>
                      {Number(record(row._count).bookings ?? 0).toLocaleString(
                        "fa-IR",
                      )}
                    </Td>
                    <Td>
                      {Number(loyalty.points ?? 0).toLocaleString("fa-IR")}
                    </Td>
                    <Td>{money(record(row.wallet).balanceRial)}</Td>
                    <Td>
                      <CustomerTypeBadge
                        label={String(tier.nameFa ?? "عادی")}
                        code={String(tier.code ?? "NORMAL")}
                      />
                    </Td>
                    <Td>{dateTime(row.lastActivityAt ?? row.updatedAt)}</Td>
                    <Td>
                      <button
                        onClick={() => setSelected(row)}
                        className="rounded-xl bg-violet-50 px-3 py-2 text-[10px] font-black text-violet-700"
                      >
                        مشاهده و تغییر نوع
                      </button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!filtered.length ? <EmptyState title="مشتری پیدا نشد" /> : null}
      </PageCard>
      {selected ? (
        <CustomerModal
          customer={selected}
          tiers={tiers}
          onClose={() => setSelected(null)}
          onChangeTier={changeTier}
        />
      ) : null}
    </div>
  );
}

function CustomerTypeBadge({ label, code }: { label: string; code: string }) {
  const color =
    code === "VIP" || code === "GOLD"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : code === "SILVER"
        ? "border-slate-300 bg-slate-100 text-slate-700"
        : code === "BRONZE"
          ? "border-orange-200 bg-orange-50 text-orange-800"
          : "border-blue-200 bg-blue-50 text-blue-700";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black ${color}`}
    >
      <Crown size={12} />
      {label}
    </span>
  );
}

function CustomerModal({
  customer,
  tiers,
  onClose,
  onChangeTier,
}: {
  customer: JsonRecord;
  tiers: JsonRecord[];
  onClose: () => void;
  onChangeTier: (customerId: string, tierId: string) => Promise<void>;
}) {
  const loyalty = record(customer.loyalty);
  const tier = record(loyalty.tier);
  const [tierId, setTierId] = useState(String(tier.id ?? ""));
  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section className="w-full max-w-xl overflow-hidden rounded-[30px] bg-white shadow-2xl">
        <div className="relative bg-[#0b0d1a] p-6 text-white">
          <button
            onClick={onClose}
            className="absolute left-4 top-4 rounded-xl p-2 text-slate-400"
          >
            <X size={19} />
          </button>
          <div className="flex items-center gap-4">
            <span className="grid size-14 place-items-center rounded-[20px] bg-violet-600 text-xl font-black">
              {String(customer.firstName ?? "م").slice(0, 1)}
            </span>
            <div>
              <h2 className="text-lg font-black">
                {`${String(customer.firstName ?? "")} ${String(customer.lastName ?? "")}`.trim() ||
                  "مشتری BestWash"}
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                عضو از {dateTime(customer.createdAt)}
              </p>
            </div>
          </div>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          <Info
            icon={Phone}
            label="شماره موبایل"
            value={String(customer.mobile)}
            ltr
          />
          <Info
            icon={Mail}
            label="ایمیل"
            value={String(customer.email ?? "ثبت نشده")}
            ltr
          />
          <Info
            icon={Sparkles}
            label="امتیاز"
            value={Number(loyalty.points ?? 0).toLocaleString("fa-IR")}
          />
          <Info
            icon={WalletCards}
            label="کیف پول"
            value={money(record(customer.wallet).balanceRial)}
          />
        </div>
        <div className="border-t border-slate-100 p-5">
          <label className="grid gap-2 text-xs font-black">
            نوع کاربری / سطح باشگاه
            <select
              value={tierId}
              onChange={(event) => setTierId(event.target.value)}
              className="admin-input"
            >
              <option value="">سطح را انتخاب کنید</option>
              {tiers.map((item) => (
                <option key={String(item.id)} value={String(item.id)}>
                  {String(item.nameFa)} · از{" "}
                  {Number(item.minPoints ?? 0).toLocaleString("fa-IR")} امتیاز
                </option>
              ))}
            </select>
          </label>
          <p className="mt-2 text-[10px] leading-5 text-slate-400">
            تغییر دستی سطح در لاگ مدیریتی ثبت می‌شود و مزایای سطح انتخاب‌شده را
            برای مشتری فعال می‌کند.
          </p>
          <button
            disabled={!tierId || tierId === tier.id}
            onClick={() => void onChangeTier(String(customer.id), tierId)}
            className="mt-4 min-h-12 w-full rounded-2xl bg-violet-600 text-xs font-black text-white disabled:opacity-40"
          >
            ذخیره نوع کاربری
          </button>
        </div>
      </section>
    </div>
  );
}
function Info({
  icon: Icon,
  label,
  value,
  ltr = false,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
      <Icon size={18} className="text-violet-600" />
      <div>
        <p className="text-[9px] text-slate-400">{label}</p>
        <b
          dir={ltr ? "ltr" : "rtl"}
          className={`mt-1 block text-xs ${ltr ? "text-left" : ""}`}
        >
          {value}
        </b>
      </div>
    </div>
  );
}

export function PaymentsView({ rows }: { rows: JsonRecord[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const filtered = useMemo(
    () =>
      rows.filter(
        (row) =>
          (status === "ALL" || row.status === status) &&
          JSON.stringify(row).toLowerCase().includes(query.toLowerCase()),
      ),
    [query, rows, status],
  );
  const totalPaid = rows
    .filter((item) => item.status === "PAID")
    .reduce((sum, item) => sum + Number(item.amountRial ?? 0), 0);
  const totalRefunded = rows
    .filter((item) => item.status === "REFUNDED")
    .reduce((sum, item) => sum + Number(item.amountRial ?? 0), 0);
  return (
    <div className="space-y-5">
      <SectionHeading
        eyebrow="مرکز مالی"
        title="پرداخت‌ها و بازپرداخت‌ها"
        text="وضعیت هر تراکنش، سهم درگاه و کیف پول و شماره پیگیری قابل فهم در دسترس است."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <FinanceCard
          icon={CircleDollarSign}
          label="پرداخت موفق"
          value={money(totalPaid)}
          tone="emerald"
        />
        <FinanceCard
          icon={WalletCards}
          label="بازپرداخت"
          value={money(totalRefunded)}
          tone="violet"
        />
        <FinanceCard
          icon={BadgeCheck}
          label="تعداد تراکنش"
          value={rows.length.toLocaleString("fa-IR")}
          tone="slate"
        />
      </div>
      <PageCard className="p-3">
        <div className="grid gap-2 md:grid-cols-[1fr_220px]">
          <label className="flex min-h-12 items-center gap-2 rounded-2xl bg-slate-50 px-4">
            <Search size={18} className="text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full bg-transparent text-xs outline-none"
              placeholder="جست‌وجوی رزرو، موبایل یا شماره پیگیری"
            />
          </label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-2xl border-0 bg-slate-50 px-4 text-xs font-bold outline-none"
          >
            <option value="ALL">همه وضعیت‌ها</option>
            <option value="PAID">پرداخت موفق</option>
            <option value="REDIRECTED">هدایت به درگاه</option>
            <option value="FAILED">ناموفق</option>
            <option value="REFUNDED">بازپرداخت</option>
          </select>
        </div>
      </PageCard>
      <PageCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-right text-xs">
            <thead className="bg-slate-50 text-[10px] text-slate-500">
              <tr>
                <Th>زمان درخواست</Th>
                <Th>مشتری</Th>
                <Th>رزرو مرتبط</Th>
                <Th>روش پرداخت</Th>
                <Th>پرداخت درگاه</Th>
                <Th>پرداخت کیف پول</Th>
                <Th>وضعیت قابل فهم</Th>
                <Th>شماره پیگیری درگاه</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={String(row.id)}
                  className="border-t border-slate-100 hover:bg-slate-50/60"
                >
                  <Td>{dateTime(row.requestedAt)}</Td>
                  <Td>
                    <span dir="ltr">
                      {String(record(row.customer).mobile ?? "—")}
                    </span>
                  </Td>
                  <Td>
                    <b dir="ltr">
                      {String(
                        record(row.booking).code ?? "هنوز رزرو نهایی نشده",
                      )}
                    </b>
                  </Td>
                  <Td>{paymentProviderLabel(row.provider)}</Td>
                  <Td>{money(row.gatewayAmountRial)}</Td>
                  <Td>{money(row.walletAmountRial)}</Td>
                  <Td>
                    <StatusBadge value={row.status} />
                  </Td>
                  <Td>
                    <span
                      dir="ltr"
                      title="شماره‌ای که درگاه پس از تأیید پرداخت صادر می‌کند"
                      className="text-left"
                    >
                      {String(
                        row.providerReferenceNumber ??
                          row.providerTrackId ??
                          "صادر نشده",
                      )}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length ? <EmptyState title="تراکنشی پیدا نشد" /> : null}
      </PageCard>
    </div>
  );
}
function FinanceCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof CircleDollarSign;
  label: string;
  value: string;
  tone: "emerald" | "violet" | "slate";
}) {
  const colors = {
    emerald: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
    slate: "bg-slate-100 text-slate-600",
  };
  return (
    <PageCard className="p-5">
      <div className="flex items-center gap-4">
        <span
          className={`grid size-11 place-items-center rounded-2xl ${colors[tone]}`}
        >
          <Icon size={20} />
        </span>
        <div>
          <p className="text-[10px] text-slate-400">{label}</p>
          <b className="mt-1 block text-lg font-black">{value}</b>
        </div>
      </div>
    </PageCard>
  );
}
function Th({ children }: { children: React.ReactNode }) {
  return <th className="whitespace-nowrap px-4 py-3 font-black">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 align-middle">{children}</td>;
}
