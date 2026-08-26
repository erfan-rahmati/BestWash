"use client";

import { CalendarDays, X } from "lucide-react";
import {
  isoDateToPersian,
  persianDateToIso,
  persianMonthLength,
} from "../../lib/persian-date";

const months = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];
const currentPersianYear = Number(
  new Intl.DateTimeFormat("en-US-u-ca-persian", { year: "numeric" })
    .formatToParts(new Date())
    .find((item) => item.type === "year")?.value,
);
const years = Array.from(
  { length: 100 },
  (_, index) => currentPersianYear - 12 - index,
);

export function PersianBirthDate({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const selected = value ? isoDateToPersian(value) : null;
  const year = selected?.year ?? currentPersianYear - 25;
  const month = selected?.month ?? 1;
  const day = selected?.day ?? 1;
  const update = (nextYear: number, nextMonth: number, nextDay: number) => {
    const safeDay = Math.min(nextDay, persianMonthLength(nextYear, nextMonth));
    onChange(persianDateToIso(nextYear, nextMonth, safeDay));
  };
  return (
    <fieldset className="mt-3 rounded-[18px] border border-[var(--bw-border)] bg-slate-50 p-3">
      <legend className="px-2 text-[11px] font-bold text-slate-700">
        تاریخ تولد
      </legend>
      <div className="mb-3 flex items-center gap-2 text-[11px] leading-5 text-slate-500">
        <CalendarDays size={17} className="shrink-0 text-blue-600" />
        تاریخ را براساس تقویم شمسی انتخاب کنید.
      </div>
      <div className="grid grid-cols-[0.8fr_1.2fr_1fr] gap-2">
        <Select
          label="روز"
          value={value ? day : 0}
          onChange={(next) => update(year, month, next)}
          options={Array.from(
            { length: persianMonthLength(year, month) },
            (_, index) => ({ value: index + 1, label: String(index + 1) }),
          )}
        />
        <Select
          label="ماه"
          value={value ? month : 0}
          onChange={(next) => update(year, next, day)}
          options={months.map((label, index) => ({ value: index + 1, label }))}
        />
        <Select
          label="سال"
          value={value ? year : 0}
          onChange={(next) => update(next, month, day)}
          options={years.map((item) => ({ value: item, label: String(item) }))}
        />
      </div>
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-[12px] bg-white text-[10px] font-bold text-slate-500"
        >
          <X size={15} />
          حذف تاریخ تولد
        </button>
      ) : null}
    </fieldset>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  options: Array<{ value: number; label: string }>;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-[10px] font-bold text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="min-h-11 w-full rounded-[12px] border border-[var(--bw-border)] bg-white px-2 text-[11px] font-bold text-slate-700 outline-none focus:border-blue-400"
      >
        <option value={0} disabled>
          انتخاب
        </option>
        {options.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}
