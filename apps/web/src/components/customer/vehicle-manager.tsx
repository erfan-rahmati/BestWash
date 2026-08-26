"use client";

import {
  CarFront,
  Check,
  LoaderCircle,
  Pencil,
  Plus,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { VehicleStep } from "../booking/vehicle-step";
import { IranLicensePlateDisplay } from "../booking/iran-license-plate-display";
import { IranLicensePlate } from "../booking/iran-license-plate";
import {
  getIranPlateResult,
  type IranPlateResult,
  type IranPlateValue,
} from "../../lib/iran-plate";
import { showToast } from "../../lib/toast";
import type { BookingVehicleSelection } from "../../lib/booking-types";
import {
  ApiError,
  createVehicle,
  deleteVehicle,
  getMyVehicles,
  setDefaultVehicle,
  updateVehicle,
  type CustomerVehicle,
} from "../../lib/api/account";
import { GuestGate } from "./guest-gate";
import { ActionSheet } from "../ui/action-sheet";

export function VehicleManager() {
  const [items, setItems] = useState<CustomerVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<CustomerVehicle | null>(null);
  const [editColor, setEditColor] = useState("");
  const [editNickname, setEditNickname] = useState("");
  const [editPlate, setEditPlate] = useState<IranPlateResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<CustomerVehicle | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getMyVehicles()
      .then((data) => {
        setItems(data);
        setUnauthorized(false);
      })
      .catch((error) => {
        if (error instanceof ApiError && error.status === 401)
          setUnauthorized(true);
        else
          setMessage(
            error instanceof Error
              ? error.message
              : "دریافت خودروها ناموفق بود.",
          );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    queueMicrotask(load);
  }, [load]);

  async function addVehicle(value: BookingVehicleSelection) {
    setSaving(true);
    setMessage(null);
    try {
      await createVehicle({
        source: value.sourceMode,
        vehicleClassId: value.vehicleClass.id,
        vehicleModelId: value.model?.id,
        customBrandName: value.customBrand || undefined,
        customModelName: value.customModel || undefined,
        color: value.color,
        plateType: value.plate.value.plateType,
        plateNormalized: value.plate.normalized,
        nickname: value.nickname || undefined,
        productionYear: value.productionYear
          ? Number(
              value.productionYear.replace(/[۰-۹]/g, (digit) =>
                String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)),
              ),
            )
          : undefined,
      });
      setAdding(false);
      setMessage("خودرو با موفقیت به فهرست شما اضافه شد.");
      showToast("خودرو با موفقیت اضافه شد.", "success");
      load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "ثبت خودرو انجام نشد.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    setMessage(null);
    try {
      await updateVehicle(editing.id, {
        color: editColor,
        nickname: editNickname,
        plateNormalized: editPlate?.isValid
          ? editPlate.normalized
          : editing.plateNormalized,
      });
      setEditing(null);
      setMessage("تغییرات خودرو ذخیره شد.");
      showToast("تغییرات خودرو ذخیره شد.", "success");
      load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ویرایش انجام نشد.");
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div className="flex min-h-52 items-center justify-center">
        <LoaderCircle className="animate-spin text-blue-600" />
      </div>
    );
  if (unauthorized) return <GuestGate title="برای مدیریت خودروها وارد شوید" />;

  return (
    <div>
      {message ? (
        <div
          role="status"
          className={`mb-4 rounded-[14px] p-3 text-[11px] leading-5 ${message.includes("موفق") || message.includes("ذخیره") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}
        >
          {message}
        </div>
      ) : null}
      {!adding ? (
        <button
          onClick={() => setAdding(true)}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-blue-600 text-[12px] font-black text-white shadow-[var(--bw-shadow-blue)]"
        >
          <Plus size={19} />
          افزودن خودروی جدید
        </button>
      ) : (
        <div>
          <button
            onClick={() => setAdding(false)}
            className="flex min-h-11 items-center gap-2 text-[11px] font-bold text-slate-500"
          >
            <X size={17} />
            بستن فرم افزودن
          </button>
          {saving ? (
            <div className="rounded-[18px] bg-blue-50 p-4 text-center text-[11px] text-blue-700">
              در حال ذخیره خودرو...
            </div>
          ) : (
            <VehicleStep
              onComplete={(value) => void addVehicle(value)}
              submitLabel="ثبت خودرو در فهرست من"
              allowSavedVehicles={false}
            />
          )}
        </div>
      )}

      {!adding ? (
        <div className="mt-5 space-y-3">
          {items.length ? (
            items.map((vehicle) => {
              const name =
                vehicle.nickname ||
                (vehicle.vehicleModel
                  ? `${vehicle.vehicleModel.brand.nameFa} ${vehicle.vehicleModel.nameFa}`
                  : `${vehicle.customBrandName ?? ""} ${vehicle.customModelName ?? ""}`.trim());
              const plate = getIranPlateResult(
                vehicle.plateType === "IRAN_MOTORCYCLE"
                  ? {
                      plateType: "IRAN_MOTORCYCLE",
                      topThree: vehicle.motorcyclePlateTop ?? "",
                      bottomFive: vehicle.motorcyclePlateBottom ?? "",
                    }
                  : {
                      plateType: "IRAN_CAR",
                      firstTwo: vehicle.carPlateFirstTwo ?? "",
                      letter: vehicle.carPlateLetter ?? "",
                      middleThree: vehicle.carPlateMiddleThree ?? "",
                      iranCode: vehicle.carPlateIranCode ?? "",
                    },
              );
              return (
                <div
                  key={vehicle.id}
                  className="rounded-[22px] border border-[var(--bw-border)] bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-blue-50 text-blue-600">
                      <CarFront size={21} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-black text-slate-800">
                          {name || "خودروی من"}
                        </p>
                        {vehicle.isDefault ? (
                          <span className="rounded-full bg-amber-50 px-2 py-1 text-[8px] font-black text-amber-700">
                            پیش‌فرض
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-[10px] text-slate-500">
                        {vehicle.vehicleClass.nameFa} · {vehicle.color}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <IranLicensePlateDisplay plate={plate} compact />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-dashed border-slate-200 pt-3">
                    <button
                      disabled={vehicle.isDefault}
                      onClick={() =>
                        void setDefaultVehicle(vehicle.id).then(load)
                      }
                      className="flex min-h-10 items-center justify-center gap-1 rounded-[12px] bg-amber-50 text-[9px] font-bold text-amber-700 disabled:opacity-40"
                    >
                      <Star size={14} />
                      پیش‌فرض
                    </button>
                    <button
                      onClick={() => {
                        setEditing(vehicle);
                        setEditColor(vehicle.color);
                        setEditNickname(vehicle.nickname ?? "");
                        setEditPlate(null);
                      }}
                      className="flex min-h-10 items-center justify-center gap-1 rounded-[12px] bg-blue-50 text-[9px] font-bold text-blue-700"
                    >
                      <Pencil size={14} />
                      ویرایش
                    </button>
                    <button
                      onClick={() => setDeleting(vehicle)}
                      className="flex min-h-10 items-center justify-center gap-1 rounded-[12px] bg-red-50 text-[9px] font-bold text-red-600"
                    >
                      <Trash2 size={14} />
                      حذف
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-[24px] border border-dashed border-blue-200 bg-blue-50/50 p-7 text-center">
              <CarFront className="mx-auto text-blue-500" />
              <p className="mt-3 text-[11px] leading-6 text-slate-600">
                هنوز خودرویی ذخیره نکرده‌اید. برای رزرو سریع‌تر، اولین خودرو را
                اضافه کنید.
              </p>
            </div>
          )}
        </div>
      ) : null}

      <ActionSheet
        open={Boolean(editing)}
        title="ویرایش خودرو"
        description="نام، رنگ و پلاک خودرو را با دقت به‌روزرسانی کنید."
        onClose={() => setEditing(null)}
      >
        {editing ? (
          <div>
            <label className="mt-4 block text-[11px] font-bold text-slate-600">
              نام دلخواه
              <input
                value={editNickname}
                onChange={(event) => setEditNickname(event.target.value)}
                className="mt-2 min-h-12 w-full rounded-[14px] border border-[var(--bw-border)] px-3 text-[12px] outline-none"
              />
            </label>
            <div className="mt-4">
              <p className="mb-2 text-[11px] font-bold text-slate-600">
                پلاک خودرو
              </p>
              <IranLicensePlate
                key={editing.id}
                vehicleType={
                  editing.plateType === "IRAN_MOTORCYCLE" ? "MOTORCYCLE" : "CAR"
                }
                initialValue={vehiclePlateValue(editing)}
                onChange={setEditPlate}
              />
            </div>
            <label className="mt-4 block text-[11px] font-bold text-slate-600">
              رنگ خودرو
              <input
                value={editColor}
                onChange={(event) => setEditColor(event.target.value)}
                className="mt-2 min-h-12 w-full rounded-[14px] border border-[var(--bw-border)] px-3 text-[12px] outline-none"
              />
            </label>
            <button
              disabled={saving || !editColor.trim()}
              onClick={() => void saveEdit()}
              className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-blue-600 text-[12px] font-black text-white disabled:opacity-50"
            >
              {saving ? (
                <LoaderCircle className="animate-spin" size={17} />
              ) : (
                <Check size={17} />
              )}
              ذخیره تغییرات
            </button>
          </div>
        ) : null}
      </ActionSheet>
      {deleting ? (
        <div
          className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-900/40 p-5 backdrop-blur-sm"
          role="alertdialog"
          aria-modal="true"
        >
          <div className="w-full max-w-[380px] rounded-[24px] bg-white p-5 shadow-2xl">
            <h3 className="text-[14px] font-black text-slate-800">حذف خودرو</h3>
            <p className="mt-2 text-[11px] leading-6 text-slate-500">
              آیا مطمئن هستید این خودرو از فهرست فعال حذف شود؟ سوابق رزرو حفظ
              می‌شود.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                onClick={() => setDeleting(null)}
                className="min-h-11 rounded-[13px] bg-slate-100 text-[10px] font-bold text-slate-600"
              >
                انصراف
              </button>
              <button
                onClick={() => {
                  const item = deleting;
                  setDeleting(null);
                  void deleteVehicle(item.id)
                    .then(() => {
                      showToast("خودرو از فهرست حذف شد.", "success");
                      load();
                    })
                    .catch((error) =>
                      showToast(
                        error instanceof Error
                          ? error.message
                          : "حذف خودرو ناموفق بود.",
                        "error",
                      ),
                    );
                }}
                className="min-h-11 rounded-[13px] bg-red-600 text-[10px] font-black text-white"
              >
                حذف خودرو
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function vehiclePlateValue(vehicle: CustomerVehicle): IranPlateValue {
  return vehicle.plateType === "IRAN_MOTORCYCLE"
    ? {
        plateType: "IRAN_MOTORCYCLE",
        topThree: vehicle.motorcyclePlateTop ?? "",
        bottomFive: vehicle.motorcyclePlateBottom ?? "",
      }
    : {
        plateType: "IRAN_CAR",
        firstTwo: vehicle.carPlateFirstTwo ?? "",
        letter: vehicle.carPlateLetter ?? "",
        middleThree: vehicle.carPlateMiddleThree ?? "",
        iranCode: vehicle.carPlateIranCode ?? "",
      };
}
