"use client";

import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import {
  createEmptyIranPlate,
  getIranPlateResult,
  IRAN_CAR_PLATE_LETTERS,
  normalizeDigits,
  toPersianDigits,
  type IranPlateResult,
  type IranPlateValue,
  type VehicleType,
} from "../../lib/iran-plate";
import { SelectionSheet, type SelectionSheetItem } from "../ui/selection-sheet";

interface IranLicensePlateProps {
  vehicleType?: VehicleType;
  allowTypeSwitch?: boolean;
  initialValue?: IranPlateValue;
  onChange: (result: IranPlateResult) => void;
}

function NumericPlateInput({
  value,
  length,
  label,
  onChange,
  className = "",
}: {
  value: string;
  length: number;
  label: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <input
      value={toPersianDigits(value)}
      onChange={(event) => {
        onChange(normalizeDigits(event.target.value).slice(0, length));
      }}
      inputMode="numeric"
      autoComplete="off"
      aria-label={label}
      className={`min-w-0 bg-transparent text-center text-[18px] font-black text-slate-900 outline-none placeholder:text-slate-300 ${className}`}
      placeholder={"•".repeat(length)}
    />
  );
}

export function IranLicensePlate({
  vehicleType = "CAR",
  allowTypeSwitch = false,
  initialValue,
  onChange,
}: IranLicensePlateProps) {
  const [currentType, setCurrentType] = useState<VehicleType>(vehicleType);

  const [plate, setPlate] = useState<IranPlateValue>(
    () => initialValue ?? createEmptyIranPlate(vehicleType),
  );

  const [letterSheetOpen, setLetterSheetOpen] = useState(false);

  function updatePlate(nextValue: IranPlateValue) {
    setPlate(nextValue);
    onChange(getIranPlateResult(nextValue));
  }

  function switchType(nextType: VehicleType) {
    if (nextType === currentType) {
      return;
    }

    setCurrentType(nextType);

    const empty = createEmptyIranPlate(nextType);

    setPlate(empty);
    onChange(getIranPlateResult(empty));
  }

  const letterItems: SelectionSheetItem[] = IRAN_CAR_PLATE_LETTERS.map(
    (letter) => ({
      id: letter,
      title: letter,
      subtitle: `حرف ${letter}`,
    }),
  );

  const valid = getIranPlateResult(plate).isValid;

  return (
    <div>
      {allowTypeSwitch ? (
        <div className="mb-5">
          <p className="mb-2 text-[9px] font-extrabold text-slate-600">
            نوع پلاک
          </p>

          <div className="grid grid-cols-2 rounded-[15px] border border-[var(--bw-border)] bg-[var(--bw-bg)] p-1">
            <button
              type="button"
              onClick={() => switchType("CAR")}
              className={`min-h-10 rounded-[11px] text-[9px] font-black transition ${
                currentType === "CAR"
                  ? "bg-[var(--bw-surface)] text-[var(--bw-primary-700)] shadow-sm"
                  : "text-slate-400"
              }`}
            >
              خودرو
            </button>

            <button
              type="button"
              onClick={() => switchType("MOTORCYCLE")}
              className={`min-h-10 rounded-[11px] text-[9px] font-black transition ${
                currentType === "MOTORCYCLE"
                  ? "bg-[var(--bw-surface)] text-[var(--bw-primary-700)] shadow-sm"
                  : "text-slate-400"
              }`}
            >
              موتورسیکلت
            </button>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[20px] border-2 border-slate-800 bg-white shadow-[0_12px_28px_rgba(15,34,55,0.10)]">
        {plate.plateType === "IRAN_CAR" ? (
          <div dir="ltr" className="flex min-h-[82px] w-full">
            <div className="flex w-[52px] shrink-0 flex-col items-center justify-between bg-[#0755a5] px-1.5 py-2 text-white">
              <div className="w-full overflow-hidden rounded-[2px] border border-white/50">
                <div className="h-[3px] bg-emerald-500" />
                <div className="h-[3px] bg-white" />
                <div className="h-[3px] bg-red-500" />
              </div>

              <span className="text-[6px] font-black tracking-tight">I.R.</span>

              <span className="text-[7px] font-black tracking-tight">IRAN</span>
            </div>

            <div className="flex min-w-0 flex-1 items-stretch divide-x divide-slate-300">
              <div className="flex w-[18%] items-center justify-center px-1">
                <NumericPlateInput
                  value={plate.firstTwo}
                  length={2}
                  label="دو رقم اول پلاک"
                  onChange={(value) =>
                    updatePlate({
                      ...plate,
                      firstTwo: value,
                    })
                  }
                />
              </div>

              <button
                type="button"
                onClick={() => setLetterSheetOpen(true)}
                className="flex w-[17%] items-center justify-center gap-1 bg-white px-1 text-[20px] font-black text-slate-900"
                aria-label="انتخاب حرف پلاک"
              >
                {plate.letter || "ـ"}
                <ChevronDown size={12} className="text-slate-400" />
              </button>

              <div className="flex w-[27%] items-center justify-center px-1">
                <NumericPlateInput
                  value={plate.middleThree}
                  length={3}
                  label="سه رقم میانی پلاک"
                  onChange={(value) =>
                    updatePlate({
                      ...plate,
                      middleThree: value,
                    })
                  }
                />
              </div>

              <div className="flex min-w-0 flex-1 flex-col items-center justify-center border-l border-slate-300 px-1">
                <span
                  dir="rtl"
                  className="text-[8px] font-black text-slate-700"
                >
                  ایران
                </span>

                <NumericPlateInput
                  value={plate.iranCode}
                  length={2}
                  label="کد ایران پلاک"
                  onChange={(value) =>
                    updatePlate({
                      ...plate,
                      iranCode: value,
                    })
                  }
                  className="mt-0.5 text-[17px]"
                />
              </div>
            </div>
          </div>
        ) : (
          <div dir="ltr" className="flex min-h-[120px] w-full">
            <div className="flex w-[52px] shrink-0 flex-col items-center justify-between bg-[#0755a5] px-1.5 py-3 text-white">
              <div className="w-full overflow-hidden rounded-[2px] border border-white/50">
                <div className="h-[3px] bg-emerald-500" />
                <div className="h-[3px] bg-white" />
                <div className="h-[3px] bg-red-500" />
              </div>

              <span className="text-[6px] font-black">I.R.</span>

              <span className="text-[7px] font-black">IRAN</span>
            </div>

            <div className="grid min-w-0 flex-1 grid-rows-2 divide-y-2 divide-slate-800 bg-white">
              <div className="flex items-center justify-center">
                <NumericPlateInput
                  value={plate.topThree}
                  length={3}
                  label="سه رقم بالای پلاک موتور"
                  onChange={(value) =>
                    updatePlate({
                      ...plate,
                      topThree: value,
                    })
                  }
                  className="text-[22px]"
                />
              </div>

              <div className="flex items-center justify-center">
                <NumericPlateInput
                  value={plate.bottomFive}
                  length={5}
                  label="پنج رقم پایین پلاک موتور"
                  onChange={(value) =>
                    updatePlate({
                      ...plate,
                      bottomFive: value,
                    })
                  }
                  className="text-[22px]"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div
        className={`mt-3 flex items-center gap-2 rounded-[13px] border px-3 py-2.5 ${
          valid
            ? "border-emerald-100 bg-emerald-50"
            : "border-[var(--bw-border)] bg-[var(--bw-bg)]"
        }`}
      >
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] ${
            valid
              ? "bg-emerald-500 text-white"
              : "bg-[var(--bw-surface)] text-slate-300"
          }`}
        >
          <Check size={14} />
        </span>

        <div>
          <p
            className={`text-[8px] font-black ${
              valid ? "text-emerald-700" : "text-slate-500"
            }`}
          >
            {valid ? "پلاک کامل شد" : "پلاک را کامل وارد کنید"}
          </p>

          <p className="mt-0.5 text-[7px] text-slate-400">
            اعداد فارسی و انگلیسی هر دو پذیرفته می‌شوند.
          </p>
        </div>
      </div>

      <SelectionSheet
        open={letterSheetOpen}
        title="انتخاب حرف پلاک"
        description="حرف درج‌شده روی پلاک خودرو را انتخاب کنید."
        searchPlaceholder="جستجوی حرف..."
        items={letterItems}
        selectedId={plate.plateType === "IRAN_CAR" ? plate.letter : undefined}
        onClose={() => setLetterSheetOpen(false)}
        onSelect={(item) => {
          if (plate.plateType !== "IRAN_CAR") {
            return;
          }

          updatePlate({
            ...plate,
            letter: item.id,
          });

          setLetterSheetOpen(false);
        }}
      />
    </div>
  );
}
