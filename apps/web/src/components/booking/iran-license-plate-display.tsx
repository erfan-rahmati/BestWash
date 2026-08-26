import { toPersianDigits, type IranPlateResult } from "../../lib/iran-plate";

interface IranLicensePlateDisplayProps {
  plate: IranPlateResult;
  compact?: boolean;
  size?: "small" | "medium" | "large";
}

export function IranLicensePlateDisplay({
  plate,
  compact = false,
  size = compact ? "medium" : "large",
}: IranLicensePlateDisplayProps) {
  const maxWidth =
    size === "small"
      ? "max-w-[210px]"
      : size === "medium"
        ? "max-w-[300px]"
        : "max-w-[380px]";
  const minHeight =
    size === "small"
      ? "min-h-[48px]"
      : size === "medium"
        ? "min-h-[64px]"
        : "min-h-[78px]";
  if (plate.value.plateType === "IRAN_MOTORCYCLE") {
    return (
      <div
        className={`overflow-hidden rounded-[16px] border-2 border-slate-800 bg-white shadow-[0_8px_20px_rgba(15,34,55,0.08)] ${
          maxWidth
        }`}
      >
        <div
          dir="ltr"
          className={`flex w-full ${
            size === "small"
              ? "min-h-[64px]"
              : size === "medium"
                ? "min-h-[82px]"
                : "min-h-[110px]"
          }`}
        >
          <div className="flex w-[46px] shrink-0 flex-col items-center justify-between bg-[#0755a5] px-1.5 py-2 text-white">
            <div className="w-full overflow-hidden rounded-[2px] border border-white/50">
              <div className="h-[3px] bg-emerald-500" />
              <div className="h-[3px] bg-white" />
              <div className="h-[3px] bg-red-500" />
            </div>

            <span className="text-[5px] font-black">I.R.</span>

            <span className="text-[6px] font-black">IRAN</span>
          </div>

          <div className="grid min-w-0 flex-1 grid-rows-2 divide-y-2 divide-slate-800">
            <div className="flex items-center justify-center text-[18px] font-black text-slate-900">
              {toPersianDigits(plate.value.topThree)}
            </div>

            <div className="flex items-center justify-center text-[18px] font-black text-slate-900">
              {toPersianDigits(plate.value.bottomFive)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-[16px] border-2 border-slate-800 bg-white shadow-[0_8px_20px_rgba(15,34,55,0.08)] ${`w-full ${maxWidth}`}`}
    >
      <div dir="ltr" className={`flex w-full ${minHeight}`}>
        <div className="flex w-[46px] shrink-0 flex-col items-center justify-between bg-[#0755a5] px-1.5 py-2 text-white">
          <div className="w-full overflow-hidden rounded-[2px] border border-white/50">
            <div className="h-[3px] bg-emerald-500" />
            <div className="h-[3px] bg-white" />
            <div className="h-[3px] bg-red-500" />
          </div>

          <span className="text-[5px] font-black tracking-tight">I.R.</span>

          <span className="text-[6px] font-black tracking-tight">IRAN</span>
        </div>

        <div className="flex min-w-0 flex-1 items-stretch divide-x divide-slate-300">
          <div className="flex w-[18%] items-center justify-center px-1 text-[16px] font-black text-slate-900">
            {toPersianDigits(plate.value.firstTwo)}
          </div>

          <div className="flex w-[16%] items-center justify-center px-1 text-[18px] font-black text-slate-900">
            {plate.value.letter}
          </div>

          <div className="flex w-[28%] items-center justify-center px-1 text-[16px] font-black text-slate-900">
            {toPersianDigits(plate.value.middleThree)}
          </div>

          <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-1">
            <span dir="rtl" className="text-[7px] font-black text-slate-700">
              ایران
            </span>

            <span className="mt-0.5 text-[15px] font-black text-slate-900">
              {toPersianDigits(plate.value.iranCode)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
