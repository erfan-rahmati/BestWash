"use client";

import {
  AlertCircle,
  ArrowLeft,
  CarFront,
  Check,
  ChevronDown,
  LoaderCircle,
  PencilLine,
  Save,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { BookingVehicleSelection } from "../../lib/booking-types";
import type { IranPlateResult } from "../../lib/iran-plate";
import { plateFromBooking } from "../../lib/booking-plate";
import {
  getVehicleBrands,
  getVehicleClasses,
  getVehicleModels,
  type VehicleBrand,
  type VehicleClass,
  type VehicleModel,
} from "../../lib/api/vehicle-catalog";
import { SelectionSheet, type SelectionSheetItem } from "../ui/selection-sheet";
import { ActionSheet } from "../ui/action-sheet";
import { IranLicensePlate } from "./iran-license-plate";
import { IranLicensePlateDisplay } from "./iran-license-plate-display";
import { VehicleColorField } from "./vehicle-color-field";
import {
  createVehicle,
  getMyVehicles,
  type CustomerVehicle,
} from "../../lib/api/account";

type VehicleSourceMode = "CATALOG" | "CUSTOM";

interface VehicleStepProps {
  onComplete: (value: BookingVehicleSelection) => void;
  submitLabel?: string;
  allowSavedVehicles?: boolean;
}

interface SelectTriggerProps {
  label: string;
  value?: string;
  placeholder: string;
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
}

function SelectTrigger({
  label,
  value,
  placeholder,
  disabled = false,
  loading = false,
  onClick,
}: SelectTriggerProps) {
  return (
    <div>
      <span className="mb-2 block text-[9px] font-extrabold text-slate-600">
        {label}
      </span>

      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={`flex min-h-[50px] w-full items-center gap-3 rounded-[15px] border px-3.5 text-right transition ${
          disabled
            ? "cursor-not-allowed border-slate-200 bg-slate-100/70 opacity-60"
            : value
              ? "border-[var(--bw-primary-200)] bg-[var(--bw-surface)]"
              : "border-[var(--bw-border)] bg-[var(--bw-surface)]"
        }`}
      >
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-[10px] ${
              value ? "font-bold text-slate-800" : "font-medium text-slate-400"
            }`}
          >
            {value ?? placeholder}
          </span>
        </span>

        {loading ? (
          <LoaderCircle
            size={17}
            className="animate-spin text-[var(--bw-primary-500)]"
          />
        ) : (
          <ChevronDown size={17} className="shrink-0 text-slate-400" />
        )}
      </button>
    </div>
  );
}

export function VehicleStep({
  onComplete,
  submitLabel = "ادامه به انتخاب خدمات",
  allowSavedVehicles = true,
}: VehicleStepProps) {
  const [sourceMode, setSourceMode] = useState<VehicleSourceMode>("CATALOG");

  const [brands, setBrands] = useState<VehicleBrand[]>([]);

  const [classes, setClasses] = useState<VehicleClass[]>([]);

  const [models, setModels] = useState<VehicleModel[]>([]);

  const [selectedBrand, setSelectedBrand] = useState<VehicleBrand | null>(null);

  const [selectedModel, setSelectedModel] = useState<VehicleModel | null>(null);

  const [selectedCustomClass, setSelectedCustomClass] =
    useState<VehicleClass | null>(null);

  const [brandSheetOpen, setBrandSheetOpen] = useState(false);

  const [modelSheetOpen, setModelSheetOpen] = useState(false);

  const [classSheetOpen, setClassSheetOpen] = useState(false);

  const [brandsLoading, setBrandsLoading] = useState(true);

  const [classesLoading, setClassesLoading] = useState(true);

  const [modelsLoading, setModelsLoading] = useState(false);

  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [customBrand, setCustomBrand] = useState("");

  const [customModel, setCustomModel] = useState("");

  const [color, setColor] = useState("");

  const [year, setYear] = useState("");

  const [nickname, setNickname] = useState("");

  const [showPlateIntro, setShowPlateIntro] = useState(false);

  const [plateResult, setPlateResult] = useState<IranPlateResult | null>(null);
  const [savedVehicles, setSavedVehicles] = useState<CustomerVehicle[]>([]);
  const [pendingSelection, setPendingSelection] =
    useState<BookingVehicleSelection | null>(null);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!allowSavedVehicles) return;
    getMyVehicles()
      .then(setSavedVehicles)
      .catch(() => null);
  }, [allowSavedVehicles]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCatalogBasics() {
      try {
        const [brandData, classData] = await Promise.all([
          getVehicleBrands(controller.signal),
          getVehicleClasses(controller.signal),
        ]);

        setBrands(brandData);
        setClasses(classData);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setCatalogError(
          "دریافت اطلاعات خودرو با مشکل مواجه شد. لطفاً دوباره تلاش کنید.",
        );
      } finally {
        setBrandsLoading(false);
        setClassesLoading(false);
      }
    }

    void loadCatalogBasics();

    return () => {
      controller.abort();
    };
  }, []);

  function resetPlate() {
    setShowPlateIntro(false);
    setPlateResult(null);
  }

  async function selectBrand(item: SelectionSheetItem) {
    const brand = brands.find((candidate) => candidate.id === item.id) ?? null;

    if (!brand) {
      return;
    }

    setSelectedBrand(brand);
    setSelectedModel(null);
    setModels([]);
    setBrandSheetOpen(false);
    setModelsLoading(true);
    setCatalogError(null);
    resetPlate();

    try {
      const data = await getVehicleModels(brand.id);

      setModels(data);
      setModelSheetOpen(true);
    } catch {
      setCatalogError("دریافت مدل‌های این برند با مشکل مواجه شد.");
    } finally {
      setModelsLoading(false);
    }
  }

  function selectModel(item: SelectionSheetItem) {
    const model = models.find((candidate) => candidate.id === item.id) ?? null;

    if (!model) {
      return;
    }

    setSelectedModel(model);
    setModelSheetOpen(false);
    resetPlate();
  }

  function selectCustomClass(item: SelectionSheetItem) {
    const vehicleClass =
      classes.find((candidate) => candidate.id === item.id) ?? null;

    if (!vehicleClass) {
      return;
    }

    setSelectedCustomClass(vehicleClass);
    setClassSheetOpen(false);
    resetPlate();
  }

  function switchSourceMode(mode: VehicleSourceMode) {
    setSourceMode(mode);
    resetPlate();

    if (mode === "CUSTOM") {
      setBrandSheetOpen(false);
      setModelSheetOpen(false);
      setSelectedBrand(null);
      setSelectedModel(null);
      setModels([]);
      return;
    }

    setCustomBrand("");
    setCustomModel("");
    setSelectedCustomClass(null);
  }

  const brandItems = useMemo<SelectionSheetItem[]>(
    () =>
      brands.map((brand) => ({
        id: brand.id,
        title: brand.nameFa,
        subtitle: brand.nameEn ?? undefined,
      })),
    [brands],
  );

  const modelItems = useMemo<SelectionSheetItem[]>(
    () =>
      models.map((model) => ({
        id: model.id,
        title: model.nameFa,
        subtitle: model.nameEn ?? undefined,
        meta: model.vehicleClass.nameFa,
      })),
    [models],
  );

  const classItems = useMemo<SelectionSheetItem[]>(
    () =>
      classes.map((vehicleClass) => ({
        id: vehicleClass.id,
        title: vehicleClass.nameFa,
        subtitle: vehicleClass.nameEn ?? vehicleClass.code,
        meta:
          vehicleClass.vehicleType === "MOTORCYCLE" ? "موتورسیکلت" : "خودرو",
      })),
    [classes],
  );

  const selectedVehicleClass =
    sourceMode === "CATALOG"
      ? (selectedModel?.vehicleClass ?? null)
      : selectedCustomClass;

  const basicInformationComplete =
    sourceMode === "CATALOG"
      ? Boolean(selectedBrand && selectedModel && color.trim())
      : Boolean(
          customBrand.trim() &&
          customModel.trim() &&
          selectedCustomClass &&
          color.trim(),
        );

  function continueToPlate() {
    if (!basicInformationComplete || !selectedVehicleClass) {
      return;
    }

    setPlateResult(null);
    setShowPlateIntro(true);

    window.requestAnimationFrame(() => {
      document.getElementById("vehicle-plate-next")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }

  function continueToServices() {
    if (!plateResult?.isValid || !selectedVehicleClass) {
      return;
    }

    const selection: BookingVehicleSelection = {
      sourceMode,
      vehicleClass: selectedVehicleClass,
      brand: sourceMode === "CATALOG" ? selectedBrand : null,
      model: sourceMode === "CATALOG" ? selectedModel : null,
      customBrand: sourceMode === "CUSTOM" ? customBrand.trim() : "",
      customModel: sourceMode === "CUSTOM" ? customModel.trim() : "",
      color: color.trim(),
      productionYear: year.trim(),
      nickname: nickname.trim(),
      plate: plateResult,
    };
    if (allowSavedVehicles) {
      setPendingSelection(selection);
    } else {
      onComplete(selection);
    }
  }

  function selectSavedVehicle(vehicle: CustomerVehicle) {
    const plate: IranPlateResult = plateFromBooking({
      plateNormalized: vehicle.plateNormalized,
      customerVehicle: vehicle,
    });
    onComplete({
      sourceMode: vehicle.source,
      vehicleClass: vehicle.vehicleClass,
      brand: vehicle.vehicleModel?.brand ?? null,
      model: vehicle.vehicleModel
        ? { ...vehicle.vehicleModel, vehicleClass: vehicle.vehicleClass }
        : null,
      customBrand: vehicle.customBrandName ?? "",
      customModel: vehicle.customModelName ?? "",
      color: vehicle.color,
      productionYear: vehicle.productionYear?.toString() ?? "",
      nickname: vehicle.nickname ?? "",
      plate,
    });
  }

  async function savePendingVehicle() {
    if (!pendingSelection) return;
    setSavingVehicle(true);
    setSaveError(null);
    try {
      await createVehicle({
        source: pendingSelection.sourceMode,
        vehicleClassId: pendingSelection.vehicleClass.id,
        vehicleModelId: pendingSelection.model?.id,
        customBrandName: pendingSelection.customBrand || undefined,
        customModelName: pendingSelection.customModel || undefined,
        color: pendingSelection.color,
        plateType: pendingSelection.plate.value.plateType,
        plateNormalized: pendingSelection.plate.normalized,
        nickname: pendingSelection.nickname || undefined,
        productionYear: pendingSelection.productionYear
          ? Number(pendingSelection.productionYear)
          : undefined,
      });
      onComplete(pendingSelection);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "ذخیره خودرو انجام نشد.",
      );
    } finally {
      setSavingVehicle(false);
    }
  }

  return (
    <>
      <div className="mt-5 overflow-hidden rounded-[26px] border border-[var(--bw-border)] bg-[var(--bw-surface)] shadow-[var(--bw-shadow-soft)]">
        <div className="border-b border-[var(--bw-border)] p-5">
          <div className="flex items-start gap-3.5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-[var(--bw-primary-50)] text-[var(--bw-primary-600)]">
              <CarFront size={22} />
            </span>

            <div>
              <h2 className="text-[15px] font-black text-slate-800">
                خودروی موردنظر
              </h2>

              <p className="mt-1 text-[9px] leading-5 text-slate-400">
                اطلاعات خودرو برای انتخاب سرویس و محاسبه قیمت استفاده می‌شود.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5">
          {allowSavedVehicles && savedVehicles.length ? (
            <div className="mb-5">
              <p className="mb-3 text-[11px] font-black text-slate-700">
                خودروهای ذخیره‌شده
              </p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {savedVehicles.map((vehicle) => (
                  <button
                    key={vehicle.id}
                    type="button"
                    onClick={() => selectSavedVehicle(vehicle)}
                    className="min-w-[190px] rounded-[17px] border border-blue-100 bg-blue-50 p-3 text-right"
                  >
                    <span className="block text-[11px] font-black text-slate-800">
                      {vehicle.nickname ??
                        vehicle.vehicleModel?.nameFa ??
                        vehicle.customModelName ??
                        "خودروی من"}
                    </span>
                    <div className="mt-2">
                      <IranLicensePlateDisplay
                        plate={plateFromBooking({
                          plateNormalized: vehicle.plateNormalized,
                          customerVehicle: vehicle,
                        })}
                        size="small"
                      />
                    </div>
                    <span className="mt-2 block text-[9px] font-bold text-blue-700">
                      انتخاب این خودرو
                    </span>
                  </button>
                ))}
              </div>
              <div className="my-4 flex items-center gap-3 text-[9px] text-slate-400">
                <span className="h-px flex-1 bg-slate-200" />
                یا خودروی دیگری وارد کنید
                <span className="h-px flex-1 bg-slate-200" />
              </div>
            </div>
          ) : null}
          <div className="grid grid-cols-2 rounded-[16px] border border-[var(--bw-border)] bg-[var(--bw-bg)] p-1">
            <button
              type="button"
              onClick={() => switchSourceMode("CATALOG")}
              className={`min-h-10 rounded-[12px] text-[9px] font-black transition ${
                sourceMode === "CATALOG"
                  ? "bg-[var(--bw-surface)] text-[var(--bw-primary-700)] shadow-sm"
                  : "text-slate-400"
              }`}
            >
              انتخاب از لیست
            </button>

            <button
              type="button"
              onClick={() => switchSourceMode("CUSTOM")}
              className={`min-h-10 rounded-[12px] text-[9px] font-black transition ${
                sourceMode === "CUSTOM"
                  ? "bg-[var(--bw-surface)] text-[var(--bw-primary-700)] shadow-sm"
                  : "text-slate-400"
              }`}
            >
              خودرو در لیست نیست
            </button>
          </div>

          {catalogError ? (
            <div className="mt-4 flex items-start gap-2 rounded-[14px] border border-red-100 bg-red-50 p-3 text-red-700">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />

              <p className="text-[8px] leading-5">{catalogError}</p>
            </div>
          ) : null}

          {sourceMode === "CATALOG" ? (
            <div className="mt-5 space-y-4">
              <SelectTrigger
                label="برند خودرو"
                value={selectedBrand?.nameFa}
                placeholder="انتخاب برند خودرو"
                loading={brandsLoading}
                disabled={brandsLoading}
                onClick={() => setBrandSheetOpen(true)}
              />

              <SelectTrigger
                label="مدل خودرو"
                value={selectedModel?.nameFa}
                placeholder={
                  selectedBrand
                    ? "انتخاب مدل خودرو"
                    : "ابتدا برند خودرو را انتخاب کنید"
                }
                disabled={!selectedBrand || modelsLoading}
                loading={modelsLoading}
                onClick={() => setModelSheetOpen(true)}
              />

              {selectedModel ? (
                <div className="flex items-center gap-3 rounded-[15px] border border-blue-100 bg-[var(--bw-primary-50)] p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[var(--bw-primary-600)] text-white">
                    <Check size={17} />
                  </span>

                  <div>
                    <p className="text-[9px] font-black text-slate-700">
                      کلاس خودرو
                    </p>

                    <p className="mt-0.5 text-[8px] text-[var(--bw-primary-700)]">
                      {selectedModel.vehicleClass.nameFa}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 block text-[9px] font-extrabold text-slate-600">
                  برند خودرو
                </span>

                <div className="flex min-h-[50px] items-center gap-2 rounded-[15px] border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3.5 focus-within:border-[var(--bw-primary-300)] focus-within:ring-4 focus-within:ring-blue-100/60">
                  <PencilLine size={16} className="text-slate-400" />

                  <input
                    value={customBrand}
                    onChange={(event) => {
                      setCustomBrand(event.target.value);
                      resetPlate();
                    }}
                    placeholder="مثلاً مزدا"
                    autoComplete="off"
                    className="min-w-0 flex-1 bg-transparent text-[10px] text-slate-800 outline-none placeholder:text-slate-400"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-[9px] font-extrabold text-slate-600">
                  مدل خودرو
                </span>

                <div className="flex min-h-[50px] items-center gap-2 rounded-[15px] border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3.5 focus-within:border-[var(--bw-primary-300)] focus-within:ring-4 focus-within:ring-blue-100/60">
                  <PencilLine size={16} className="text-slate-400" />

                  <input
                    value={customModel}
                    onChange={(event) => {
                      setCustomModel(event.target.value);
                      resetPlate();
                    }}
                    placeholder="مدل خودرو را بنویسید"
                    autoComplete="off"
                    className="min-w-0 flex-1 bg-transparent text-[10px] text-slate-800 outline-none placeholder:text-slate-400"
                  />
                </div>
              </label>

              <SelectTrigger
                label="کلاس خودرو"
                value={selectedCustomClass?.nameFa}
                placeholder="انتخاب کلاس خودرو"
                loading={classesLoading}
                disabled={classesLoading}
                onClick={() => setClassSheetOpen(true)}
              />
            </div>
          )}

          <div className="mt-6">
            <VehicleColorField
              value={color}
              onChange={(value) => {
                setColor(value);
                resetPlate();
              }}
            />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-2 block text-[9px] font-extrabold text-slate-600">
                سال ساخت
                <span className="mr-1 font-medium text-slate-400">اختیاری</span>
              </span>

              <input
                value={year}
                onChange={(event) => setYear(event.target.value)}
                inputMode="numeric"
                placeholder="مثلاً ۱۴۰۲"
                className="min-h-[50px] w-full rounded-[15px] border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3.5 text-[10px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[var(--bw-primary-300)] focus:ring-4 focus:ring-blue-100/60"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[9px] font-extrabold text-slate-600">
                نام خودرو
                <span className="mr-1 font-medium text-slate-400">اختیاری</span>
              </span>

              <input
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                placeholder="ماشین شخصی"
                maxLength={40}
                className="min-h-[50px] w-full rounded-[15px] border border-[var(--bw-border)] bg-[var(--bw-surface)] px-3.5 text-[10px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[var(--bw-primary-300)] focus:ring-4 focus:ring-blue-100/60"
              />
            </label>
          </div>

          <div
            className={`mt-5 flex items-center gap-3 rounded-[15px] border p-3 transition ${
              basicInformationComplete
                ? "border-emerald-100 bg-emerald-50"
                : "border-[var(--bw-border)] bg-[var(--bw-bg)]"
            }`}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] ${
                basicInformationComplete
                  ? "bg-emerald-500 text-white"
                  : "bg-[var(--bw-surface)] text-slate-300"
              }`}
            >
              <Check size={15} />
            </span>

            <div>
              <p
                className={`text-[9px] font-black ${
                  basicInformationComplete
                    ? "text-emerald-700"
                    : "text-slate-500"
                }`}
              >
                اطلاعات اولیه خودرو
              </p>

              <p className="mt-0.5 text-[7px] leading-4 text-slate-400">
                بعد از تکمیل اطلاعات، پلاک خودرو را ثبت می‌کنیم.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={!basicInformationComplete}
            onClick={continueToPlate}
            className={`mt-4 flex min-h-[54px] w-full items-center justify-center gap-2 rounded-[16px] px-5 text-[11px] font-black transition duration-200 ${
              basicInformationComplete
                ? "bg-[#0d6de0] text-white shadow-[0_12px_28px_rgba(13,109,224,0.26)] active:scale-[0.985]"
                : "cursor-not-allowed bg-slate-200 text-slate-400"
            }`}
          >
            ادامه و ثبت پلاک
            <ArrowLeft size={17} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {showPlateIntro && selectedVehicleClass ? (
        <div
          id="vehicle-plate-next"
          className="mt-4 scroll-mt-6 rounded-[24px] border border-[var(--bw-primary-200)] bg-[linear-gradient(135deg,var(--bw-primary-50),var(--bw-surface))] p-5 shadow-[var(--bw-shadow-soft)]"
        >
          <p className="text-[9px] font-extrabold text-[var(--bw-primary-600)]">
            ادامه اطلاعات خودرو
          </p>

          <h3 className="mt-1 text-[14px] font-black text-slate-800">
            پلاک خودرو
          </h3>

          <p className="mt-2 text-[9px] leading-5 text-slate-500">
            اطلاعات پلاک را دقیقاً مطابق پلاک وسیله نقلیه وارد کنید.
          </p>

          <div className="mt-5">
            <IranLicensePlate
              vehicleType={selectedVehicleClass.vehicleType}
              allowTypeSwitch={false}
              onChange={setPlateResult}
            />
          </div>

          <button
            type="button"
            disabled={!plateResult?.isValid}
            onClick={continueToServices}
            className={`mt-4 flex min-h-[54px] w-full items-center justify-center gap-2 rounded-[16px] px-5 text-[11px] font-black transition ${
              plateResult?.isValid
                ? "bg-[#0d6de0] text-white shadow-[0_12px_28px_rgba(13,109,224,0.26)] active:scale-[0.985]"
                : "cursor-not-allowed bg-slate-200 text-slate-400"
            }`}
          >
            {submitLabel}
            <ArrowLeft size={17} strokeWidth={2.5} />
          </button>
        </div>
      ) : null}

      <SelectionSheet
        open={brandSheetOpen}
        title="انتخاب برند خودرو"
        description="برند خودروی خود را از کاتالوگ BestWash انتخاب کنید."
        searchPlaceholder="جستجوی برند..."
        items={brandItems}
        selectedId={selectedBrand?.id}
        loading={brandsLoading}
        emptyMessage="برندی با این نام پیدا نشد."
        onClose={() => setBrandSheetOpen(false)}
        onSelect={(item) => {
          void selectBrand(item);
        }}
      />

      <ActionSheet
        open={Boolean(pendingSelection)}
        title="این خودرو ذخیره شود؟"
        description="با ذخیره خودرو، رزروهای بعدی سریع‌تر و ساده‌تر انجام می‌شوند."
        onClose={() => setPendingSelection(null)}
      >
        {pendingSelection ? (
          <div>
            <div className="flex items-center gap-3 rounded-[18px] border border-blue-100 bg-blue-50 p-4">
              <span className="grid size-11 place-items-center rounded-[14px] bg-white text-blue-600 shadow-sm">
                <Save size={20} />
              </span>
              <div>
                <b className="text-[11px] text-slate-800">
                  ذخیره امن در حساب شما
                </b>
                <p className="mt-1 text-[9px] leading-5 text-slate-500">
                  اطلاعات فقط برای انتخاب سریع‌تر در رزروهای خودتان استفاده
                  می‌شود.
                </p>
              </div>
            </div>
            {saveError ? (
              <p className="mt-3 rounded-[12px] bg-red-50 p-3 text-[10px] text-red-600">
                {saveError}
              </p>
            ) : null}
            <button
              disabled={savingVehicle}
              onClick={() => void savePendingVehicle()}
              className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-blue-600 text-[11px] font-black text-white disabled:opacity-50"
            >
              {savingVehicle ? (
                <LoaderCircle size={17} className="animate-spin" />
              ) : (
                <Save size={17} />
              )}
              ذخیره و ادامه
            </button>
            <button
              disabled={savingVehicle}
              onClick={() => {
                const selection = pendingSelection;
                setPendingSelection(null);
                onComplete(selection);
              }}
              className="mt-2 min-h-11 w-full rounded-[13px] text-[10px] font-bold text-slate-500"
            >
              بدون ذخیره ادامه می‌دهم
            </button>
          </div>
        ) : null}
      </ActionSheet>

      <SelectionSheet
        open={modelSheetOpen}
        title={
          selectedBrand ? `مدل‌های ${selectedBrand.nameFa}` : "انتخاب مدل خودرو"
        }
        description="مدل خودرو، کلاس قیمت‌گذاری مناسب را مشخص می‌کند."
        searchPlaceholder="جستجوی مدل..."
        items={modelItems}
        selectedId={selectedModel?.id}
        loading={modelsLoading}
        emptyMessage="مدلی برای این برند پیدا نشد."
        onClose={() => setModelSheetOpen(false)}
        onSelect={selectModel}
      />

      <SelectionSheet
        open={classSheetOpen}
        title="انتخاب کلاس خودرو"
        description="کلاس خودرو برای محاسبه صحیح قیمت خدمات استفاده می‌شود."
        searchPlaceholder="جستجوی کلاس..."
        items={classItems}
        selectedId={selectedCustomClass?.id}
        loading={classesLoading}
        emptyMessage="کلاس خودرویی پیدا نشد."
        onClose={() => setClassSheetOpen(false)}
        onSelect={selectCustomClass}
      />
    </>
  );
}
