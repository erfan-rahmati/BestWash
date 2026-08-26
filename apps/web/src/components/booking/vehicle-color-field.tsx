"use client";

import { Palette, PencilLine } from "lucide-react";
import { useState } from "react";

const presetColors = [
  {
    label: "سفید",
    swatch: "#f8fafc",
  },
  {
    label: "مشکی",
    swatch: "#172033",
  },
  {
    label: "نقره‌ای",
    swatch: "#b9c3cf",
  },
  {
    label: "خاکستری",
    swatch: "#727e8d",
  },
  {
    label: "آبی",
    swatch: "#2475d0",
  },
  {
    label: "قرمز",
    swatch: "#d64242",
  },
] as const;

interface VehicleColorFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function VehicleColorField({ value, onChange }: VehicleColorFieldProps) {
  const [customMode, setCustomMode] = useState(false);

  function selectPreset(color: string) {
    setCustomMode(false);
    onChange(color);
  }

  function enableCustomMode() {
    setCustomMode(true);
    onChange("");
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-extrabold text-slate-600">
          رنگ خودرو
          <span className="mr-1 text-red-500">*</span>
        </p>

        <span className="flex items-center gap-1 text-[7px] font-medium text-slate-400">
          <Palette size={11} />
          انتخاب رنگ
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {presetColors.map((item) => {
          const active = !customMode && value === item.label;

          return (
            <button
              key={item.label}
              type="button"
              onClick={() => selectPreset(item.label)}
              className={`flex min-h-[44px] items-center justify-center gap-2 rounded-[13px] border px-2 text-[9px] font-bold transition active:scale-[0.98] ${
                active
                  ? "border-[var(--bw-primary-300)] bg-[var(--bw-primary-50)] text-[var(--bw-primary-700)] ring-2 ring-blue-100/60"
                  : "border-[var(--bw-border)] bg-[var(--bw-surface)] text-slate-500"
              }`}
            >
              <span
                className="h-3.5 w-3.5 shrink-0 rounded-full border border-slate-300/70 shadow-sm"
                style={{
                  backgroundColor: item.swatch,
                }}
              />

              {item.label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={enableCustomMode}
        className={`mt-2 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[13px] border text-[9px] font-bold transition active:scale-[0.99] ${
          customMode
            ? "border-[var(--bw-primary-300)] bg-[var(--bw-primary-50)] text-[var(--bw-primary-700)]"
            : "border-dashed border-[var(--bw-border-strong)] bg-[var(--bw-surface-soft)] text-slate-500"
        }`}
      >
        <PencilLine size={14} />
        رنگ دیگری است
      </button>

      {customMode ? (
        <label className="mt-3 block">
          <span className="mb-2 block text-[8px] font-bold text-slate-500">
            نام رنگ خودرو
          </span>

          <div className="flex min-h-[50px] items-center gap-2 rounded-[15px] border border-[var(--bw-primary-200)] bg-[var(--bw-surface)] px-3.5 focus-within:border-[var(--bw-primary-400)] focus-within:ring-4 focus-within:ring-blue-100/60">
            <Palette
              size={16}
              className="shrink-0 text-[var(--bw-primary-500)]"
            />

            <input
              value={value}
              onChange={(event) => onChange(event.target.value)}
              maxLength={32}
              placeholder="مثلاً زرشکی، بژ، طلایی..."
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-[10px] text-slate-800 outline-none placeholder:text-slate-400"
            />
          </div>
        </label>
      ) : null}
    </div>
  );
}
