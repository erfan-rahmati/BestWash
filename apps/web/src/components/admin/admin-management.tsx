"use client";

import {
  ArrowRight,
  BadgePercent,
  CalendarDays,
  Check,
  Copy,
  Pencil,
  Plus,
  Save,
  Search,
  Send,
  Settings2,
  Smartphone,
  Trash2,
} from "lucide-react";
import type { FormEvent, InputHTMLAttributes } from "react";
import { useMemo, useState } from "react";
import { showToast } from "../../lib/toast";
import {
  actionLabel,
  adminRequest,
  arr,
  dateTime,
  EmptyState,
  entityLabel,
  type JsonRecord,
  PageCard,
  record,
  SectionHeading,
  StatusBadge,
} from "./admin-core";

type Navigate = (path: string) => void;

const catalogTabs = [
  { id: "vehicle-classes", label: "کلاس خودرو" },
  { id: "vehicle-brands", label: "برندها" },
  { id: "vehicle-models", label: "مدل‌ها" },
  { id: "services", label: "خدمات" },
  { id: "packages", label: "پکیج‌ها" },
  { id: "addons", label: "خدمات افزوده" },
  { id: "loyalty-tiers", label: "سطوح باشگاه" },
  { id: "loyalty-rules", label: "قوانین امتیاز" },
  { id: "sms-templates", label: "قالب پیامک" },
  { id: "automations", label: "اتوماسیون‌ها" },
] as const;

type CatalogEntity = (typeof catalogTabs)[number]["id"];

const entityDescription: Record<CatalogEntity, string> = {
  "vehicle-classes": "دسته‌بندی اندازه و نوع خودرو برای قیمت‌گذاری و ظرفیت",
  "vehicle-brands": "فهرست سازندگان خودرو که مشتری هنگام رزرو می‌بیند",
  "vehicle-models": "مدل خودرو همراه با برند و کلاس مرتبط",
  services: "خدمت‌های پایه‌ای قابل قرارگرفتن در بسته‌ها",
  packages: "بسته‌های قابل رزرو و مدت انجام آن‌ها",
  addons: "خدمت‌های اختیاری قابل افزودن به رزرو",
  "loyalty-tiers": "سطح‌های باشگاه مشتریان بر اساس امتیاز",
  "loyalty-rules": "قوانین دریافت امتیاز پس از رویدادهای مشخص",
  "sms-templates": "متن‌های پیامکی و شناسه قالب متناظر در SMS.ir",
  automations: "ارسال خودکار پیام پس از رخدادهای مشتری",
};

export function CatalogView({
  route,
  datasets,
  token,
  navigate,
  refresh,
}: {
  route: string;
  datasets: Record<string, JsonRecord[]>;
  token: string;
  navigate: Navigate;
  refresh: () => void;
}) {
  const parts = route.split("/");
  const selected = (parts[1] || "vehicle-classes") as CatalogEntity;
  const isEditor = parts[2] === "new" || parts[2] === "edit";
  if (isEditor)
    return (
      <CatalogEditor
        entity={selected}
        id={parts[2] === "edit" ? parts[3] : undefined}
        rows={datasets[selected] ?? []}
        datasets={datasets}
        token={token}
        navigate={navigate}
        refresh={refresh}
      />
    );
  const rows = datasets[selected] ?? [];
  return (
    <div className="space-y-5">
      <SectionHeading
        eyebrow="مدیریت ساده و بدون کدنویسی"
        title="کاتالوگ خدمات"
        text="هر بخش را با فرم روشن فارسی ایجاد و ویرایش کنید؛ هیچ داده فنی از مدیر خواسته نمی‌شود."
        action={
          <button
            onClick={() => navigate(`catalog/${selected}/new`)}
            className="admin-primary"
          >
            <Plus size={16} />
            افزودن {catalogTabs.find((item) => item.id === selected)?.label}
          </button>
        }
      />
      <div className="flex gap-2 overflow-x-auto pb-1 bw-scrollbar-hidden">
        {catalogTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => navigate(`catalog/${tab.id}`)}
            className={`min-h-11 shrink-0 rounded-2xl px-4 text-[11px] font-black ${selected === tab.id ? "bg-slate-950 text-white shadow-lg" : "border border-slate-200 bg-white text-slate-600"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <PageCard className="overflow-hidden">
        <div className="flex items-center border-b border-slate-100 p-5">
          <div>
            <h2 className="text-sm font-black">
              {catalogTabs.find((item) => item.id === selected)?.label}
            </h2>
            <p className="mt-1 text-[10px] text-slate-400">
              {entityDescription[selected]}
            </p>
          </div>
          <span className="mr-auto rounded-xl bg-violet-50 px-3 py-2 text-[10px] font-black text-violet-700">
            {rows.length.toLocaleString("fa-IR")} مورد
          </span>
        </div>
        <div className="divide-y divide-slate-100">
          {rows.map((item) => (
            <CatalogRow
              key={String(item.id)}
              entity={selected}
              item={item}
              navigate={navigate}
            />
          ))}
          {!rows.length ? (
            <EmptyState title="هنوز موردی در این بخش ثبت نشده است" />
          ) : null}
        </div>
      </PageCard>
    </div>
  );
}

function CatalogRow({
  entity,
  item,
  navigate,
}: {
  entity: CatalogEntity;
  item: JsonRecord;
  navigate: Navigate;
}) {
  const brand = record(item.brand);
  const vehicleClass = record(item.vehicleClass);
  const title = String(item.nameFa ?? item.title ?? item.code ?? "بدون عنوان");
  const details =
    entity === "vehicle-models"
      ? `${String(brand.nameFa ?? "برند نامشخص")} · ${String(vehicleClass.nameFa ?? "کلاس نامشخص")}`
      : entity === "packages" || entity === "addons"
        ? `${Number(item.durationMinutes ?? 0).toLocaleString("fa-IR")} دقیقه`
        : entity === "loyalty-tiers"
          ? `از ${Number(item.minPoints ?? 0).toLocaleString("fa-IR")} امتیاز`
          : entity === "sms-templates"
            ? `کانال: ${item.channel === "SMS" ? "پیامک" : item.channel === "PUSH" ? "اعلان لحظه‌ای مرورگر" : "اعلان درون‌برنامه‌ای"}`
            : String(
                item.descriptionFa ??
                  item.eventName ??
                  item.triggerEvent ??
                  item.code ??
                  "",
              );
  return (
    <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <b className="text-xs">{title}</b>
          <StatusBadge value={item.isActive === false ? "DRAFT" : "ACTIVE"} />
        </div>
        <p className="mt-2 truncate text-[10px] text-slate-400">{details}</p>
      </div>
      <button
        onClick={() => navigate(`catalog/${entity}/edit/${String(item.id)}`)}
        className="admin-secondary"
      >
        <Pencil size={14} />
        مشاهده و ویرایش
      </button>
    </div>
  );
}

function CatalogEditor({
  entity,
  id,
  rows,
  datasets,
  token,
  navigate,
  refresh,
}: {
  entity: CatalogEntity;
  id?: string;
  rows: JsonRecord[];
  datasets: Record<string, JsonRecord[]>;
  token: string;
  navigate: Navigate;
  refresh: () => void;
}) {
  const current = rows.find((item) => String(item.id) === id) ?? {};
  const [active, setActive] = useState(current.isActive !== false);
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const data = catalogPayload(entity, form, active, current);
    setBusy(true);
    try {
      await adminRequest(
        `/admin/catalog/${entity}${id ? `/${id}` : ""}`,
        token,
        { method: id ? "PUT" : "POST", body: JSON.stringify({ data }) },
      );
      showToast("تغییرات با موفقیت ذخیره شد.", "success");
      refresh();
      navigate(`catalog/${entity}`);
    } catch (cause) {
      showToast(
        cause instanceof Error ? cause.message : "ذخیره انجام نشد.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }
  async function deactivate() {
    if (!id || !confirm("این مورد غیرفعال شود؟")) return;
    try {
      await adminRequest(`/admin/catalog/${entity}/${id}`, token, {
        method: "DELETE",
      });
      showToast("مورد غیرفعال شد.", "success");
      refresh();
      navigate(`catalog/${entity}`);
    } catch (cause) {
      showToast(
        cause instanceof Error ? cause.message : "عملیات انجام نشد.",
        "error",
      );
    }
  }
  async function permanentlyDelete() {
    if (
      !id ||
      !confirm(
        "این مورد برای همیشه حذف شود؟ این عملیات قابل بازگشت نیست و فقط برای داده‌ای انجام می‌شود که در سوابق قبلی استفاده نشده باشد.",
      )
    )
      return;
    try {
      await adminRequest(`/admin/catalog/${entity}/${id}/permanent`, token, {
        method: "DELETE",
      });
      showToast("مورد برای همیشه حذف شد.", "success");
      refresh();
      navigate(`catalog/${entity}`);
    } catch (cause) {
      showToast(
        cause instanceof Error ? cause.message : "حذف دائمی انجام نشد.",
        "error",
      );
    }
  }
  return (
    <div className="mx-auto max-w-4xl">
      <SectionHeading
        eyebrow={
          catalogTabs.find((item) => item.id === entity)?.label ?? "کاتالوگ"
        }
        title={id ? "ویرایش مورد" : "افزودن مورد جدید"}
        text={entityDescription[entity]}
        action={
          <button
            onClick={() => navigate(`catalog/${entity}`)}
            className="admin-secondary"
          >
            <ArrowRight size={15} />
            بازگشت
          </button>
        }
      />
      <form onSubmit={submit}>
        <PageCard className="p-5 sm:p-7">
          <CatalogFields
            entity={entity}
            current={current}
            datasets={datasets}
          />
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl bg-slate-50 p-4">
            <button
              type="button"
              role="switch"
              aria-checked={active}
              onClick={() => setActive((value) => !value)}
              className={`relative h-7 w-12 rounded-full transition ${active ? "bg-emerald-500" : "bg-slate-300"}`}
            >
              <span
                className={`absolute top-1 size-5 rounded-full bg-white transition ${active ? "right-6" : "right-1"}`}
              />
            </button>
            <div>
              <b className="block text-xs">
                {active ? "فعال و قابل استفاده" : "غیرفعال"}
              </b>
              <span className="text-[9px] text-slate-400">
                در هر زمان می‌توانید وضعیت را تغییر دهید.
              </span>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              disabled={busy}
              className="admin-primary min-w-40 justify-center"
            >
              <Save size={16} />
              {busy ? "در حال ذخیره..." : "ذخیره تغییرات"}
            </button>
            {id ? (
              <>
                <button
                  type="button"
                  onClick={() => void deactivate()}
                  className="admin-secondary"
                >
                  غیرفعال کردن
                </button>
                <button
                  type="button"
                  onClick={() => void permanentlyDelete()}
                  className="admin-danger"
                >
                  <Trash2 size={15} />
                  حذف دائمی
                </button>
              </>
            ) : null}
          </div>
        </PageCard>
      </form>
    </div>
  );
}

function CatalogFields({
  entity,
  current,
  datasets,
}: {
  entity: CatalogEntity;
  current: JsonRecord;
  datasets: Record<string, JsonRecord[]>;
}) {
  const common = (
    <>
      <Field
        name="nameFa"
        label="عنوان فارسی"
        defaultValue={String(current.nameFa ?? "")}
        required
      />
      <Field
        name="code"
        label="کد داخلی (حروف انگلیسی)"
        defaultValue={String(current.code ?? "")}
        dir="ltr"
        required={!current.slug}
      />
      <Field
        name="sortOrder"
        label="اولویت نمایش"
        type="number"
        defaultValue={String(current.sortOrder ?? 0)}
      />
    </>
  );
  if (entity === "vehicle-classes")
    return (
      <Grid>
        {common}
        <Select
          name="vehicleType"
          label="نوع وسیله"
          defaultValue={String(current.vehicleType ?? "CAR")}
          options={[
            { value: "CAR", label: "خودرو" },
            { value: "MOTORCYCLE", label: "موتورسیکلت" },
          ]}
        />
      </Grid>
    );
  if (entity === "vehicle-brands")
    return (
      <Grid>
        <Field
          name="nameFa"
          label="نام فارسی برند"
          defaultValue={String(current.nameFa ?? "")}
          required
        />
        <Field
          name="nameEn"
          label="نام انگلیسی"
          defaultValue={String(current.nameEn ?? "")}
          dir="ltr"
        />
        <Field
          name="slug"
          label="نشانی انگلیسی برند"
          defaultValue={String(current.slug ?? "")}
          dir="ltr"
          required
        />
        <Field
          name="sortOrder"
          label="اولویت نمایش"
          type="number"
          defaultValue={String(current.sortOrder ?? 0)}
        />
      </Grid>
    );
  if (entity === "vehicle-models")
    return (
      <Grid>
        <Field
          name="nameFa"
          label="نام فارسی مدل"
          defaultValue={String(current.nameFa ?? "")}
          required
        />
        <Field
          name="slug"
          label="نشانی انگلیسی مدل"
          defaultValue={String(current.slug ?? "")}
          dir="ltr"
          required
        />
        <Select
          name="brandId"
          label="برند خودرو"
          defaultValue={String(
            record(current.brand).id ?? current.brandId ?? "",
          )}
          options={(datasets["vehicle-brands"] ?? []).map((item) => ({
            value: String(item.id),
            label: String(item.nameFa),
          }))}
        />
        <Select
          name="vehicleClassId"
          label="کلاس خودرو"
          defaultValue={String(
            record(current.vehicleClass).id ?? current.vehicleClassId ?? "",
          )}
          options={(datasets["vehicle-classes"] ?? []).map((item) => ({
            value: String(item.id),
            label: String(item.nameFa),
          }))}
        />
        <Field
          name="sortOrder"
          label="اولویت نمایش"
          type="number"
          defaultValue={String(current.sortOrder ?? 0)}
        />
      </Grid>
    );
  if (entity === "services")
    return (
      <Grid>
        {common}
        <TextArea
          name="descriptionFa"
          label="توضیح قابل نمایش"
          defaultValue={String(current.descriptionFa ?? "")}
        />
      </Grid>
    );
  if (entity === "packages" || entity === "addons")
    return (
      <div className="space-y-6">
        <Grid>
          {common}
          <TextArea
            name="descriptionFa"
            label="توضیح قابل نمایش"
            defaultValue={String(current.descriptionFa ?? "")}
          />
          <Field
            name="durationMinutes"
            label="مدت انجام (دقیقه)"
            type="number"
            min="0"
            defaultValue={String(current.durationMinutes ?? 0)}
            required
          />
          {entity === "packages" ? (
            <>
              <Field
                name="badgeFa"
                label="نشان روی کارت (اختیاری)"
                defaultValue={String(current.badgeFa ?? "")}
                placeholder="محبوب"
              />
              <CheckOption
                name="isFeatured"
                value="true"
                defaultChecked={Boolean(current.isFeatured)}
              >
                نمایش به‌عنوان پکیج پیشنهادی
              </CheckOption>
            </>
          ) : (
            <CheckOption
              name="isRecommended"
              value="true"
              defaultChecked={Boolean(current.isRecommended)}
            >
              نمایش به‌عنوان خدمت پیشنهادی
            </CheckOption>
          )}
        </Grid>
        {entity === "packages" ? (
          <div className="rounded-2xl border border-slate-200 p-4">
            <h3 className="text-xs font-black">خدمات داخل این پکیج</h3>
            <p className="mt-1 text-[9px] text-slate-400">
              مواردی را که مشتری با خرید این پکیج دریافت می‌کند انتخاب کنید.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(datasets.services ?? []).map((service) => (
                <CheckOption
                  key={String(service.id)}
                  name="serviceIds"
                  value={String(service.id)}
                  defaultChecked={arr(current.items).some(
                    (item) => String(item.serviceId) === String(service.id),
                  )}
                >
                  {String(service.nameFa)}
                </CheckOption>
              ))}
            </div>
          </div>
        ) : null}
        <div className="rounded-2xl border border-slate-200 p-4">
          <h3 className="text-xs font-black">قیمت برای هر کلاس خودرو</h3>
          <p className="mt-1 text-[9px] text-slate-400">
            مبلغ‌ها را به ریال وارد کنید؛ صفر یعنی رایگان.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(datasets["vehicle-classes"] ?? []).map((vehicleClass) => {
              const price = arr(current.prices).find(
                (row) => String(row.vehicleClassId) === String(vehicleClass.id),
              );
              return (
                <Field
                  key={String(vehicleClass.id)}
                  name={`price:${String(vehicleClass.id)}`}
                  label={`قیمت ${String(vehicleClass.nameFa)} (ریال)`}
                  type="number"
                  min="0"
                  step="1000"
                  defaultValue={String(price?.amountRial ?? "")}
                  required
                />
              );
            })}
          </div>
        </div>
      </div>
    );
  if (entity === "loyalty-tiers")
    return (
      <Grid>
        <Field
          name="nameFa"
          label="نام سطح"
          defaultValue={String(current.nameFa ?? "")}
          required
        />
        <Field
          name="code"
          label="کد سطح"
          defaultValue={String(current.code ?? "")}
          dir="ltr"
          required
        />
        <Field
          name="minPoints"
          label="حداقل امتیاز"
          type="number"
          min="0"
          defaultValue={String(current.minPoints ?? 0)}
          required
        />
        <Field
          name="maxPoints"
          label="حداکثر امتیاز (اختیاری)"
          type="number"
          min="0"
          defaultValue={String(current.maxPoints ?? "")}
        />
        <Field
          name="cashbackMultiplier"
          label="ضریب بازگشت وجه"
          type="number"
          step="0.1"
          min="0"
          defaultValue={String(current.cashbackMultiplier ?? 1)}
        />
        <Field
          name="sortOrder"
          label="اولویت نمایش"
          type="number"
          defaultValue={String(current.sortOrder ?? 0)}
        />
      </Grid>
    );
  if (entity === "loyalty-rules")
    return (
      <Grid>
        <Field
          name="nameFa"
          label="نام قابل فهم قانون"
          defaultValue={String(current.nameFa ?? "")}
          required
        />
        <Field
          name="code"
          label="کد قانون"
          defaultValue={String(current.code ?? "")}
          dir="ltr"
          required
        />
        <Select
          name="eventName"
          label="زمان اعمال"
          defaultValue={String(current.eventName ?? "BOOKING_COMPLETED")}
          options={[
            { value: "BOOKING_COMPLETED", label: "بعد از تکمیل رزرو" },
            { value: "FIRST_BOOKING", label: "بعد از اولین رزرو" },
            { value: "REFERRAL", label: "پس از معرفی مشتری" },
          ]}
        />
        <Field
          name="points"
          label="امتیاز هدیه"
          type="number"
          defaultValue={String(current.points ?? 0)}
          required
        />
      </Grid>
    );
  if (entity === "sms-templates")
    return (
      <Grid>
        <Field
          name="code"
          label="کد قالب در سامانه"
          defaultValue={String(current.code ?? "")}
          dir="ltr"
          required
        />
        <Select
          name="channel"
          label="کانال ارسال"
          defaultValue={String(current.channel ?? "SMS")}
          options={[
            { value: "SMS", label: "پیامک" },
            { value: "IN_APP", label: "اعلان درون برنامه" },
            { value: "PUSH", label: "اعلان لحظه‌ای مرورگر" },
          ]}
        />
        <Field
          name="title"
          label="عنوان داخلی قالب"
          defaultValue={String(current.title ?? "")}
        />
        <Field
          name="providerTemplateId"
          label="شناسه قالب در SMS.ir"
          defaultValue={String(current.providerTemplateId ?? "")}
          dir="ltr"
        />
        <TextArea
          name="body"
          label="متن پیام"
          defaultValue={String(current.body ?? "")}
          help="متغیرها را با آکولاد بنویسید؛ نمونه: {code} یا {bookingCode}"
          required
        />
      </Grid>
    );
  return (
    <Grid>
      <Field
        name="nameFa"
        label="نام اتوماسیون"
        defaultValue={String(current.nameFa ?? "")}
        required
      />
      <Field
        name="code"
        label="کد اتوماسیون"
        defaultValue={String(current.code ?? "")}
        dir="ltr"
        required
      />
      <Select
        name="triggerEvent"
        label="رویداد آغازگر"
        defaultValue={String(current.triggerEvent ?? "BOOKING_COMPLETED")}
        options={[
          { value: "BOOKING_COMPLETED", label: "تکمیل رزرو" },
          { value: "CUSTOMER_REGISTERED", label: "ثبت‌نام مشتری" },
          { value: "PAYMENT_COMPLETED", label: "پرداخت موفق" },
          { value: "PICKUP_READY", label: "آماده تحویل" },
        ]}
      />
      <Select
        name="templateCode"
        label="قالب پیام"
        defaultValue={String(current.templateCode ?? "")}
        options={(datasets["sms-templates"] ?? []).map((item) => ({
          value: String(item.code),
          label: String(item.title ?? item.code),
        }))}
      />
      <Field
        name="delayMinutes"
        label="فاصله تا ارسال (دقیقه)"
        type="number"
        min="0"
        defaultValue={String(current.delayMinutes ?? 0)}
      />
    </Grid>
  );
}

function catalogPayload(
  entity: CatalogEntity,
  form: FormData,
  active: boolean,
  current: JsonRecord,
) {
  const get = (key: string) => String(form.get(key) ?? "").trim();
  const number = (key: string, fallback = 0) =>
    get(key) === "" ? fallback : Number(get(key));
  if (entity === "vehicle-classes")
    return {
      code: get("code"),
      nameFa: get("nameFa"),
      vehicleType: get("vehicleType"),
      sortOrder: number("sortOrder"),
      isActive: active,
    };
  if (entity === "vehicle-brands")
    return {
      nameFa: get("nameFa"),
      nameEn: get("nameEn") || null,
      slug: get("slug"),
      sortOrder: number("sortOrder"),
      isActive: active,
    };
  if (entity === "vehicle-models")
    return {
      nameFa: get("nameFa"),
      slug: get("slug"),
      brandId: get("brandId"),
      vehicleClassId: get("vehicleClassId"),
      sortOrder: number("sortOrder"),
      aliases: arr(current.aliases),
      isActive: active,
    };
  if (entity === "services")
    return {
      code: get("code"),
      nameFa: get("nameFa"),
      descriptionFa: get("descriptionFa") || null,
      sortOrder: number("sortOrder"),
      isActive: active,
    };
  if (entity === "packages")
    return {
      code: get("code"),
      nameFa: get("nameFa"),
      descriptionFa: get("descriptionFa") || null,
      badgeFa: get("badgeFa") || null,
      durationMinutes: number("durationMinutes"),
      sortOrder: number("sortOrder"),
      isFeatured: form.get("isFeatured") === "true",
      serviceIds: form.getAll("serviceIds").map(String),
      priceRows: priceRows(form),
      isActive: active,
    };
  if (entity === "addons")
    return {
      code: get("code"),
      nameFa: get("nameFa"),
      descriptionFa: get("descriptionFa") || null,
      durationMinutes: number("durationMinutes"),
      sortOrder: number("sortOrder"),
      isRecommended: form.get("isRecommended") === "true",
      priceRows: priceRows(form),
      isActive: active,
    };
  if (entity === "loyalty-tiers")
    return {
      code: get("code"),
      nameFa: get("nameFa"),
      minPoints: number("minPoints"),
      maxPoints: get("maxPoints") ? number("maxPoints") : null,
      cashbackMultiplier: number("cashbackMultiplier", 1),
      sortOrder: number("sortOrder"),
      isActive: active,
    };
  if (entity === "loyalty-rules")
    return {
      code: get("code"),
      nameFa: get("nameFa"),
      eventName: get("eventName"),
      points: number("points"),
      conditions: current.conditions ?? null,
      isActive: active,
    };
  if (entity === "sms-templates")
    return {
      code: get("code"),
      channel: get("channel"),
      title: get("title") || null,
      body: get("body"),
      providerTemplateId: get("providerTemplateId") || null,
      isTransactional: true,
      isActive: active,
    };
  return {
    code: get("code"),
    nameFa: get("nameFa"),
    triggerEvent: get("triggerEvent"),
    templateCode: get("templateCode"),
    delayMinutes: number("delayMinutes"),
    conditions: current.conditions ?? null,
    frequencyCap: current.frequencyCap ?? null,
    isActive: active,
  };
}

function priceRows(form: FormData) {
  return [...form.entries()]
    .filter(([key]) => key.startsWith("price:"))
    .map(([key, value]) => ({
      vehicleClassId: key.slice("price:".length),
      amountRial: Number(value),
    }))
    .filter(
      (row) =>
        row.vehicleClassId &&
        Number.isInteger(row.amountRial) &&
        row.amountRial >= 0,
    );
}

export function MarketingView({
  route,
  rows,
  tiers,
  token,
  navigate,
  refresh,
}: {
  route: string;
  rows: JsonRecord[];
  tiers: JsonRecord[];
  token: string;
  navigate: Navigate;
  refresh: () => void;
}) {
  const parts = route.split("/");
  if (parts[1] === "new" || parts[1] === "edit")
    return (
      <MarketingEditor
        current={
          parts[1] === "edit"
            ? (rows.find((item) => String(item.id) === parts[2]) ?? {})
            : {}
        }
        tiers={tiers}
        token={token}
        navigate={navigate}
        refresh={refresh}
      />
    );
  return (
    <div className="space-y-5">
      <SectionHeading
        eyebrow="کمپین و وفادارسازی"
        title="تخفیف و بازاریابی"
        text="اعتبار، گروه هدف و روش اطلاع‌رسانی هر کد تخفیف را دقیق و قابل فهم تنظیم کنید."
        action={
          <button
            onClick={() => navigate("marketing/new")}
            className="admin-primary"
          >
            <Plus size={16} />
            کد تخفیف جدید
          </button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((coupon) => (
          <PageCard key={String(coupon.id)} className="p-5">
            <div className="flex items-start gap-3">
              <span className="grid size-12 place-items-center rounded-2xl bg-violet-50 text-violet-700">
                <BadgePercent />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <b dir="ltr" className="text-base">
                    {String(coupon.code)}
                  </b>
                  <StatusBadge value={coupon.isActive ? "ACTIVE" : "DRAFT"} />
                </div>
                <p className="mt-1 text-[10px] text-slate-400">
                  {coupon.type === "PERCENTAGE"
                    ? `${Number(coupon.value).toLocaleString("fa-IR")}٪ تخفیف`
                    : `${Number(coupon.value).toLocaleString("fa-IR")} ریال تخفیف`}
                </p>
              </div>
              <button
                onClick={() => navigate(`marketing/edit/${String(coupon.id)}`)}
                className="admin-secondary mr-auto"
              >
                <Pencil size={14} />
                ویرایش
              </button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 text-[10px]">
              <Mini
                label="اعتبار"
                value={`${coupon.startsAt ? dateTime(coupon.startsAt) : "از همین حالا"} تا ${coupon.endsAt ? dateTime(coupon.endsAt) : "بدون پایان"}`}
              />
              <Mini
                label="هر مشتری"
                value={`${Number(coupon.perCustomerUsage ?? 1).toLocaleString("fa-IR")} بار`}
              />
              <Mini
                label="شرط رزرو"
                value={
                  coupon.firstBookingOnly
                    ? "فقط اولین رزرو"
                    : Number(coupon.minimumPriorBookings)
                      ? `حداقل ${Number(coupon.minimumPriorBookings).toLocaleString("fa-IR")} رزرو قبلی`
                      : "بدون محدودیت"
                }
              />
              <Mini
                label="تعداد مصرف"
                value={Number(record(coupon._count).usages ?? 0).toLocaleString(
                  "fa-IR",
                )}
              />
            </div>
          </PageCard>
        ))}
      </div>
      {!rows.length ? (
        <PageCard>
          <EmptyState title="کمپینی ثبت نشده است" />
        </PageCard>
      ) : null}
    </div>
  );
}

function MarketingEditor({
  current,
  tiers,
  token,
  navigate,
  refresh,
}: {
  current: JsonRecord;
  tiers: JsonRecord[];
  token: string;
  navigate: Navigate;
  refresh: () => void;
}) {
  const [active, setActive] = useState(current.isActive !== false);
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const channels = form.getAll("channels").map(String);
    const eligibleTierCodes = form.getAll("tiers").map(String);
    const data = {
      code: String(form.get("code") ?? "")
        .trim()
        .toUpperCase(),
      type: form.get("type"),
      value: Number(form.get("value")),
      startsAt: form.get("startsAt")
        ? new Date(String(form.get("startsAt"))).toISOString()
        : null,
      endsAt: form.get("endsAt")
        ? new Date(String(form.get("endsAt"))).toISOString()
        : null,
      maxUsage: form.get("maxUsage") ? Number(form.get("maxUsage")) : null,
      perCustomerUsage: Number(form.get("perCustomerUsage") ?? 1),
      minimumAmountRial: Number(form.get("minimumAmountRial") ?? 0),
      firstBookingOnly: form.get("firstBookingOnly") === "on",
      minimumPriorBookings: Number(form.get("minimumPriorBookings") ?? 0),
      minimumPoints: Number(form.get("minimumPoints") ?? 0),
      eligibleTierCodes,
      deliveryChannels: channels,
      displayPlacement: form.get("displayPlacement") || null,
      promotionFrequency: form.get("promotionFrequency") || "ONCE",
      isActive: active,
    };
    setBusy(true);
    try {
      await adminRequest(
        `/admin/catalog/coupons${current.id ? `/${String(current.id)}` : ""}`,
        token,
        { method: current.id ? "PUT" : "POST", body: JSON.stringify({ data }) },
      );
      showToast("کمپین ذخیره شد.", "success");
      refresh();
      navigate("marketing");
    } catch (cause) {
      showToast(
        cause instanceof Error ? cause.message : "ذخیره انجام نشد.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }
  const selectedTiers = arr(current.eligibleTierCodes).map(String);
  const selectedChannels = arr(current.deliveryChannels).map(String);
  return (
    <div className="mx-auto max-w-5xl">
      <SectionHeading
        eyebrow="کمپین بازاریابی"
        title={current.id ? "ویرایش کد تخفیف" : "ساخت کد تخفیف"}
        text="شرایط را روشن تعریف کنید تا پیشنهاد فقط به مشتری واجد شرایط و فقط در زمان مناسب نمایش داده شود."
        action={
          <button
            onClick={() => navigate("marketing")}
            className="admin-secondary"
          >
            <ArrowRight size={15} />
            بازگشت
          </button>
        }
      />
      <form onSubmit={submit} className="grid gap-5 lg:grid-cols-2">
        <PageCard className="p-5">
          <h3 className="text-sm font-black">مبلغ و بازه اعتبار</h3>
          <Grid className="mt-4">
            <Field
              name="code"
              label="کد تخفیف"
              defaultValue={String(current.code ?? "")}
              dir="ltr"
              required
            />
            <Select
              name="type"
              label="نوع تخفیف"
              defaultValue={String(current.type ?? "PERCENTAGE")}
              options={[
                { value: "PERCENTAGE", label: "درصدی" },
                { value: "FIXED", label: "مبلغ ثابت" },
              ]}
            />
            <Field
              name="value"
              label="مقدار تخفیف"
              type="number"
              min="1"
              defaultValue={String(current.value ?? "")}
              required
            />
            <Field
              name="minimumAmountRial"
              label="حداقل مبلغ سفارش (ریال)"
              type="number"
              min="0"
              defaultValue={String(current.minimumAmountRial ?? 0)}
            />
            <Field
              name="startsAt"
              label="شروع اعتبار"
              type="datetime-local"
              defaultValue={localInput(current.startsAt)}
            />
            <Field
              name="endsAt"
              label="پایان اعتبار"
              type="datetime-local"
              defaultValue={localInput(current.endsAt)}
            />
            <Field
              name="maxUsage"
              label="حداکثر مصرف کل (اختیاری)"
              type="number"
              min="1"
              defaultValue={String(current.maxUsage ?? "")}
            />
            <Field
              name="perCustomerUsage"
              label="حداکثر مصرف هر مشتری"
              type="number"
              min="1"
              defaultValue={String(current.perCustomerUsage ?? 1)}
            />
          </Grid>
        </PageCard>
        <PageCard className="p-5">
          <h3 className="text-sm font-black">مشتریان واجد شرایط</h3>
          <Grid className="mt-4">
            <Field
              name="minimumPriorBookings"
              label="حداقل رزرو قبلی"
              type="number"
              min="0"
              defaultValue={String(current.minimumPriorBookings ?? 0)}
            />
            <Field
              name="minimumPoints"
              label="حداقل امتیاز باشگاه"
              type="number"
              min="0"
              defaultValue={String(current.minimumPoints ?? 0)}
            />
          </Grid>
          <label className="mt-4 flex items-center gap-2 rounded-2xl bg-slate-50 p-4 text-xs font-black">
            <input
              name="firstBookingOnly"
              type="checkbox"
              defaultChecked={Boolean(current.firstBookingOnly)}
              className="size-4 accent-violet-600"
            />
            فقط برای اولین رزرو مشتری
          </label>
          <p className="mt-4 text-[10px] font-black">سطح‌های مجاز باشگاه</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {tiers.map((tier) => (
              <CheckOption
                key={String(tier.id)}
                name="tiers"
                value={String(tier.code)}
                defaultChecked={selectedTiers.includes(String(tier.code))}
              >
                {String(tier.nameFa)}
              </CheckOption>
            ))}
          </div>
          <p className="mt-2 text-[9px] text-slate-400">
            اگر هیچ سطحی انتخاب نشود، همه سطح‌ها مجاز هستند.
          </p>
        </PageCard>
        <PageCard className="p-5 lg:col-span-2">
          <h3 className="text-sm font-black">روش اطلاع‌رسانی پیشنهاد</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            <CheckOption
              name="channels"
              value="IN_APP"
              defaultChecked={selectedChannels.includes("IN_APP")}
            >
              اعلان درون برنامه
            </CheckOption>
            <CheckOption
              name="channels"
              value="SMS"
              defaultChecked={selectedChannels.includes("SMS")}
            >
              پیامک
            </CheckOption>
            <CheckOption
              name="channels"
              value="PUSH"
              defaultChecked={selectedChannels.includes("PUSH")}
            >
              اعلان لحظه‌ای مرورگر
            </CheckOption>
          </div>
          <label className="mt-4 grid gap-2 text-xs font-black">
            تعداد نمایش پیشنهاد به هر مشتری
            <select
              name="promotionFrequency"
              defaultValue={String(current.promotionFrequency ?? "ONCE")}
              className="admin-input"
            >
              <option value="ONCE">فقط یک بار پس از واجد شرایط شدن</option>
              <option value="EVERY_ELIGIBLE_PAYMENT">
                پس از هر پرداخت واجد شرایط
              </option>
            </select>
          </label>
          <label className="mt-4 grid gap-2 text-xs font-black">
            محل نمایش پیشنهاد
            <select
              name="displayPlacement"
              defaultValue={String(
                current.displayPlacement ?? "PAYMENT_SUCCESS",
              )}
              className="admin-input"
            >
              <option value="PAYMENT_SUCCESS">پس از پرداخت موفق</option>
              <option value="HOME">صفحه اصلی</option>
              <option value="BOOKING">هنگام رزرو</option>
              <option value="NOTIFICATIONS">فقط در اعلان‌ها</option>
            </select>
          </label>
          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
            <button
              type="button"
              onClick={() => setActive((value) => !value)}
              className={`relative h-7 w-12 rounded-full ${active ? "bg-emerald-500" : "bg-slate-300"}`}
            >
              <span
                className={`absolute top-1 size-5 rounded-full bg-white transition ${active ? "right-6" : "right-1"}`}
              />
            </button>
            <b className="text-xs">
              {active ? "کمپین فعال است" : "کمپین غیرفعال است"}
            </b>
          </div>
          <button
            disabled={busy}
            className="admin-primary mt-5 min-w-48 justify-center"
          >
            <Save size={16} />
            {busy ? "در حال ذخیره..." : "ذخیره کمپین"}
          </button>
        </PageCard>
      </form>
    </div>
  );
}

export function SupportView({
  rows,
  token,
  refresh,
}: {
  rows: JsonRecord[];
  token: string;
  refresh: () => void;
}) {
  const [selectedId, setSelectedId] = useState(String(rows[0]?.id ?? ""));
  const [query, setQuery] = useState("");
  const selected = rows.find((item) => String(item.id) === selectedId);
  const filtered = useMemo(
    () =>
      rows.filter((item) =>
        JSON.stringify(item).toLowerCase().includes(query.toLowerCase()),
      ),
    [query, rows],
  );
  async function reply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    const body = String(form.get("body") ?? "").trim();
    if (!body) return;
    try {
      await adminRequest(
        `/admin/support-tickets/${String(selected.id)}/reply`,
        token,
        {
          method: "POST",
          body: JSON.stringify({
            data: { body, close: form.get("close") === "on" },
          }),
        },
      );
      showToast("پاسخ در همین تیکت ثبت شد.", "success");
      event.currentTarget.reset();
      refresh();
    } catch (cause) {
      showToast(
        cause instanceof Error ? cause.message : "ارسال پاسخ انجام نشد.",
        "error",
      );
    }
  }
  return (
    <div className="space-y-5">
      <SectionHeading
        eyebrow="گفت‌وگوی یکپارچه"
        title="پشتیبانی مشتریان"
        text="هر تیکت یک گفت‌وگوی پیوسته است؛ پاسخ‌های مشتری و پشتیبانی در همان پرونده باقی می‌مانند."
      />
      <div className="grid min-h-[650px] gap-5 xl:grid-cols-[380px_1fr]">
        <PageCard className="overflow-hidden">
          <div className="border-b border-slate-100 p-3">
            <label className="flex min-h-11 items-center gap-2 rounded-2xl bg-slate-50 px-3">
              <Search size={16} className="text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full bg-transparent text-xs outline-none"
                placeholder="جست‌وجوی تیکت"
              />
            </label>
          </div>
          <div className="max-h-[650px] divide-y divide-slate-100 overflow-y-auto">
            {filtered.map((ticket) => (
              <button
                key={String(ticket.id)}
                onClick={() => setSelectedId(String(ticket.id))}
                className={`block w-full p-4 text-right ${selectedId === ticket.id ? "bg-violet-50" : "hover:bg-slate-50"}`}
              >
                <div className="flex items-center gap-2">
                  <b className="truncate text-xs">{String(ticket.subject)}</b>
                  <StatusBadge value={ticket.status} />
                </div>
                <p className="mt-2 text-[10px] text-slate-500">
                  {customerName(record(ticket.customer))} ·{" "}
                  {String(ticket.code)}
                </p>
                <p className="mt-2 text-[9px] text-slate-400">
                  آخرین تغییر: {dateTime(ticket.updatedAt)}
                </p>
              </button>
            ))}
            {!filtered.length ? <EmptyState title="تیکتی پیدا نشد" /> : null}
          </div>
        </PageCard>
        <PageCard className="flex min-h-[650px] flex-col overflow-hidden">
          {selected ? (
            <>
              <div className="border-b border-slate-100 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-black">
                    {String(selected.subject)}
                  </h2>
                  <StatusBadge value={selected.status} />
                </div>
                <p className="mt-2 text-[10px] text-slate-400">
                  {customerName(record(selected.customer))} ·{" "}
                  {String(record(selected.customer).mobile)} · کد{" "}
                  {String(selected.code)}
                </p>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/60 p-5">
                {arr(selected.messages).map((message) => (
                  <div
                    key={String(message.id)}
                    className={`max-w-[82%] rounded-[20px] p-4 ${message.authorType === "ADMIN" ? "mr-auto bg-violet-600 text-white" : "ml-auto border border-slate-200 bg-white"}`}
                  >
                    <p className="whitespace-pre-wrap text-xs leading-7">
                      {String(message.body)}
                    </p>
                    <small
                      className={`mt-2 block text-[9px] ${message.authorType === "ADMIN" ? "text-violet-200" : "text-slate-400"}`}
                    >
                      {message.authorType === "ADMIN"
                        ? "پشتیبانی BestWash"
                        : "مشتری"}{" "}
                      · {dateTime(message.createdAt)}
                    </small>
                  </div>
                ))}
              </div>
              <form onSubmit={reply} className="border-t border-slate-100 p-4">
                <textarea
                  name="body"
                  rows={3}
                  className="admin-textarea"
                  placeholder="پاسخ خود را بنویسید..."
                  required
                />
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-500">
                    <input
                      type="checkbox"
                      name="close"
                      className="accent-violet-600"
                    />
                    پس از پاسخ تیکت بسته شود
                  </label>
                  <button className="admin-primary mr-auto">
                    <Send size={15} />
                    ارسال پاسخ
                  </button>
                </div>
              </form>
            </>
          ) : (
            <EmptyState title="برای مشاهده گفت‌وگو یک تیکت را انتخاب کنید" />
          )}
        </PageCard>
      </div>
    </div>
  );
}

export function MessagesView({
  messages,
  templates,
  tiers,
  token,
  navigate,
  refresh,
}: {
  messages: JsonRecord[];
  templates: JsonRecord[];
  tiers: JsonRecord[];
  token: string;
  navigate: Navigate;
  refresh: () => void;
}) {
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await adminRequest("/admin/messages/broadcast", token, {
        method: "POST",
        body: JSON.stringify({
          data: {
            body: form.get("body"),
            tierCode: form.get("tierCode") || null,
          },
        }),
      });
      showToast("پیام در صف ارسال قرار گرفت.", "success");
      event.currentTarget.reset();
      refresh();
    } catch (cause) {
      showToast(
        cause instanceof Error ? cause.message : "ارسال انجام نشد.",
        "error",
      );
    }
  }
  return (
    <div className="space-y-5">
      <SectionHeading
        eyebrow="اتصال آماده SMS.ir"
        title="پیامک‌ها"
        text="متن‌های قالبی، ارسال گروهی و نتیجه هر پیام را کاملاً فارسی مشاهده کنید."
        action={
          <button
            onClick={() => navigate("catalog/sms-templates")}
            className="admin-secondary"
          >
            <Settings2 size={15} />
            مدیریت قالب‌ها
          </button>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <PageCard className="p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-violet-50 text-violet-700">
              <Smartphone />
            </span>
            <div>
              <h2 className="text-sm font-black">ارسال پیام گروهی</h2>
              <p className="mt-1 text-[10px] text-slate-400">
                ارسال بر اساس سطح باشگاه
              </p>
            </div>
          </div>
          <form onSubmit={send} className="mt-5 space-y-4">
            <label className="grid gap-2 text-xs font-black">
              گروه مخاطب
              <select name="tierCode" className="admin-input">
                <option value="">همه مشتریان فعال</option>
                {tiers.map((tier) => (
                  <option key={String(tier.id)} value={String(tier.code)}>
                    {String(tier.nameFa)}
                  </option>
                ))}
              </select>
            </label>
            <TextArea
              name="body"
              label="متن پیام"
              defaultValue=""
              help="حداکثر ۳۰۰ نویسه؛ هزینه ارسال بر اساس پنل SMS.ir محاسبه می‌شود."
              required
            />
            <button className="admin-primary w-full justify-center">
              <Send size={16} />
              ارسال پیامک
            </button>
          </form>
          <div className="mt-6 border-t border-slate-100 pt-5">
            <h3 className="text-xs font-black">قالب‌های فعال</h3>
            <div className="mt-3 space-y-2">
              {templates.slice(0, 6).map((item) => (
                <div
                  key={String(item.id)}
                  className="rounded-2xl bg-slate-50 p-3"
                >
                  <b className="text-[10px]">
                    {String(item.title ?? item.code)}
                  </b>
                  <p className="mt-1 line-clamp-2 text-[9px] leading-5 text-slate-400">
                    {String(item.body)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </PageCard>
        <PageCard className="overflow-hidden">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-sm font-black">تاریخچه پیامک‌ها</h2>
            <p className="mt-1 text-[10px] text-slate-400">
              آخرین نتیجه ثبت‌شده برای هر گیرنده
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {messages.map((message) => (
              <div
                key={String(message.id)}
                className="grid gap-3 p-4 md:grid-cols-[1fr_160px_140px] md:items-center"
              >
                <div>
                  <b className="text-xs">
                    {String(
                      message.title ??
                        templateName(message.templateCode, templates),
                    )}
                  </b>
                  <p className="mt-1 line-clamp-2 text-[10px] leading-5 text-slate-500">
                    {message.body
                      ? String(message.body)
                      : friendlyPayload(message)}
                  </p>
                </div>
                <div dir="ltr" className="text-left text-[10px] text-slate-500">
                  {String(message.recipient)}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <StatusBadge value={message.status} />
                  <small className="text-[9px] text-slate-400">
                    {dateTime(message.createdAt)}
                  </small>
                </div>
              </div>
            ))}
            {!messages.length ? (
              <EmptyState title="هنوز پیامکی ثبت نشده است" />
            ) : null}
          </div>
        </PageCard>
      </div>
    </div>
  );
}

export function SettingsView({
  schedule,
  settings,
  token,
  refresh,
}: {
  schedule: JsonRecord;
  settings: JsonRecord[];
  token: string;
  refresh: () => void;
}) {
  const rules = arr(schedule.rules);
  const overrides = arr(schedule.overrides);
  const timeBlocks = arr(schedule.timeBlocks);
  const [blockDate, setBlockDate] = useState("");
  const [blockStart, setBlockStart] = useState("12:00");
  const [blockEnd, setBlockEnd] = useState("12:30");
  const [blockReason, setBlockReason] = useState("");
  async function saveRule(rule: JsonRecord, patch: JsonRecord) {
    try {
      await adminRequest(
        `/admin/schedule/rules/${String(rule.weekday)}`,
        token,
        {
          method: "PUT",
          body: JSON.stringify({
            weekday: Number(rule.weekday),
            isOpen: patch.isOpen ?? rule.isOpen,
            openMinute: Number(patch.openMinute ?? rule.openMinute),
            closeMinute: Number(patch.closeMinute ?? rule.closeMinute),
            capacity: Number(patch.capacity ?? rule.capacity),
            slotStepMinutes: 30,
          }),
        },
      );
      showToast("ساعت کاری ذخیره شد.", "success");
      refresh();
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : "ذخیره نشد.", "error");
    }
  }
  async function addOverride(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await adminRequest("/admin/schedule/overrides", token, {
        method: "POST",
        body: JSON.stringify({
          localDate: form.get("localDate"),
          isClosed: form.get("isClosed") === "on",
          openMinute: timeToMinute(String(form.get("openTime") || "08:00")),
          closeMinute: timeToMinute(
            String(form.get("closeTime") || "21:30"),
            true,
          ),
          capacity: Number(form.get("capacity") ?? 1),
          note: form.get("note") || null,
        }),
      });
      showToast("تغییر برنامه آن روز ذخیره شد.", "success");
      event.currentTarget.reset();
      refresh();
    } catch (cause) {
      showToast(
        cause instanceof Error ? cause.message : "ثبت انجام نشد.",
        "error",
      );
    }
  }
  async function removeOverride(id: string) {
    if (!confirm("این تغییر روزانه حذف شود؟")) return;
    await adminRequest(`/admin/schedule/overrides/${id}`, token, {
      method: "DELETE",
    });
    refresh();
  }
  async function addTimeBlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await adminRequest("/admin/schedule/time-blocks", token, {
        method: "POST",
        body: JSON.stringify({
          localDate: blockDate,
          startMinute: timeToMinute(blockStart),
          endMinute: timeToMinute(blockEnd, true),
          reason: blockReason,
        }),
      });
      showToast("بازه انتخاب‌شده غیرفعال شد.", "success");
      setBlockReason("");
      refresh();
    } catch (cause) {
      showToast(
        cause instanceof Error ? cause.message : "ثبت محدودیت انجام نشد.",
        "error",
      );
    }
  }
  async function removeTimeBlock(id: string) {
    if (!confirm("این بازه دوباره برای رزرو فعال شود؟")) return;
    try {
      await adminRequest(`/admin/schedule/time-blocks/${id}`, token, {
        method: "DELETE",
      });
      showToast("محدودیت برداشته شد و بازه دوباره قابل رزرو است.", "success");
      refresh();
    } catch (cause) {
      showToast(
        cause instanceof Error ? cause.message : "حذف محدودیت انجام نشد.",
        "error",
      );
    }
  }
  async function saveSetting(item: JsonRecord, value: unknown) {
    try {
      await adminRequest(
        `/admin/catalog/business-settings/${String(item.id)}`,
        token,
        {
          method: "PUT",
          body: JSON.stringify({
            data: {
              key: String(item.key),
              value,
              isPublic: item.isPublic === true,
            },
          }),
        },
      );
      showToast("تنظیم عمومی ذخیره شد.", "success");
      refresh();
    } catch (cause) {
      showToast(
        cause instanceof Error ? cause.message : "ذخیره تنظیم انجام نشد.",
        "error",
      );
    }
  }
  return (
    <div className="space-y-5">
      <SectionHeading
        eyebrow="برنامه کاری و اطلاعات عمومی"
        title="تنظیمات کسب‌وکار"
        text="روزها و زمان‌های قابل رزرو را با انتخاب‌های ساده کنترل کنید؛ بازه کامل قابل مدیریت از ۶ صبح تا نیمه‌شب است."
      />
      <PageCard className="p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-violet-50 text-violet-700">
            <CalendarDays />
          </span>
          <div>
            <h2 className="text-sm font-black">برنامه هفتگی</h2>
            <p className="mt-1 text-[10px] text-slate-400">
              پیش‌فرض فعال: ۸:۰۰ تا ۲۱:۳۰، فاصله رزروها ۳۰ دقیقه
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 xl:grid-cols-2">
          {rules.map((rule) => (
            <ScheduleRow key={String(rule.id)} rule={rule} onSave={saveRule} />
          ))}
        </div>
      </PageCard>
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <PageCard className="p-5">
          <h2 className="text-sm font-black">تعطیلی یا تغییر یک روز مشخص</h2>
          <p className="mt-1 text-[10px] leading-5 text-slate-400">
            دلیل تعطیلی با رنگ قرمز در انتخاب تاریخ برنامه به مشتری نمایش داده
            می‌شود.
          </p>
          <form onSubmit={addOverride} className="mt-5 space-y-4">
            <Field name="localDate" label="تاریخ" type="date" required />
            <label className="flex items-center gap-2 rounded-2xl bg-rose-50 p-4 text-xs font-black text-rose-700">
              <input
                type="checkbox"
                name="isClosed"
                className="size-4 accent-rose-600"
              />
              این روز کاملاً تعطیل است
            </label>
            <Grid>
              <Field
                name="openTime"
                label="شروع ویژه"
                type="time"
                min="06:00"
                max="23:30"
                step="1800"
                defaultValue="08:00"
              />
              <Field
                name="closeTime"
                label="پایان ویژه"
                type="time"
                min="06:30"
                max="00:00"
                step="1800"
                defaultValue="21:30"
              />
              <Field
                name="capacity"
                label="ظرفیت هر زمان"
                type="number"
                min="1"
                defaultValue="1"
              />
            </Grid>
            <TextArea
              name="note"
              label="دلیل تعطیلی یا تغییر"
              defaultValue=""
              placeholder="مثلاً: تعطیلی رسمی"
            />
            <button className="admin-primary w-full justify-center">
              <Save size={16} />
              ثبت برنامه این روز
            </button>
          </form>
        </PageCard>
        <PageCard className="overflow-hidden">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-sm font-black">روزهای استثنا</h2>
            <p className="mt-1 text-[10px] text-slate-400">
              تغییرهای ثبت‌شده نسبت به برنامه هفتگی
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {overrides.map((item) => (
              <div
                key={String(item.id)}
                className="flex flex-wrap items-center gap-3 p-4"
              >
                <div>
                  <b className="text-xs">
                    {new Intl.DateTimeFormat("fa-IR", {
                      dateStyle: "full",
                    }).format(new Date(String(item.localDate)))}
                  </b>
                  <p
                    className={`mt-1 text-[10px] ${item.isClosed ? "text-rose-600" : "text-slate-500"}`}
                  >
                    {item.isClosed
                      ? `تعطیل · ${String(item.note ?? "بدون توضیح")}`
                      : `${minuteToTime(Number(item.openMinute))} تا ${minuteToTime(Number(item.closeMinute))} · ${String(item.note ?? "ساعت ویژه")}`}
                  </p>
                </div>
                <button
                  onClick={() => void removeOverride(String(item.id))}
                  className="mr-auto grid size-10 place-items-center rounded-xl bg-rose-50 text-rose-600"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            {!overrides.length ? (
              <EmptyState title="روز استثنایی ثبت نشده است" />
            ) : null}
          </div>
        </PageCard>
      </div>
      <PageCard className="p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <h2 className="text-sm font-black">غیرفعال‌کردن چند زمان مشخص</h2>
            <p className="mt-1 text-[10px] leading-5 text-slate-400">
              برای توقف موقت پذیرش، یک بازه نیم‌ساعته یا چند بازه پیوسته را
              همراه با دلیل مسدود کنید. با حذف محدودیت، زمان دوباره فعال می‌شود.
            </p>
          </div>
        </div>
        <form
          onSubmit={addTimeBlock}
          className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-[1fr_150px_150px_1.5fr_auto]"
        >
          <Field
            name="blockDate"
            label="تاریخ"
            type="date"
            value={blockDate}
            onChange={(event) => setBlockDate(event.target.value)}
            required
          />
          <Field
            name="blockStart"
            label="از ساعت"
            type="time"
            min="06:00"
            max="23:30"
            step="1800"
            value={blockStart}
            onChange={(event) => setBlockStart(event.target.value)}
            required
          />
          <Field
            name="blockEnd"
            label="تا ساعت"
            type="time"
            min="06:30"
            max="00:00"
            step="1800"
            value={blockEnd}
            onChange={(event) => setBlockEnd(event.target.value)}
            required
          />
          <Field
            name="blockReason"
            label="دلیل نمایش‌داده‌شده"
            placeholder="مثلاً: سرویس دوره‌ای تجهیزات"
            value={blockReason}
            onChange={(event) => setBlockReason(event.target.value)}
            required
          />
          <button className="admin-primary self-end justify-center">
            غیرفعال‌کردن زمان
          </button>
        </form>
        {blockDate ? (
          <div className="mt-4 rounded-2xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <b className="text-xs">جدول نیم‌ساعته ۶ صبح تا نیمه‌شب</b>
              <span className="text-[9px] text-slate-400">
                یک زمان آزاد را بزنید تا در فرم انتخاب شود؛ زمان قرمز را بزنید
                تا محدودیت آن برداشته شود.
              </span>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-9 xl:grid-cols-12">
              {Array.from({ length: 36 }, (_, index) => 360 + index * 30).map(
                (minute) => {
                  const blocked = timeBlocks.find(
                    (item) =>
                      String(item.localDate).slice(0, 10) === blockDate &&
                      Number(item.startMinute) <= minute &&
                      Number(item.endMinute) > minute,
                  );
                  const selected = blockStart === minuteToTime(minute);
                  return (
                    <button
                      key={minute}
                      type="button"
                      title={String(blocked?.reason ?? "زمان قابل مدیریت")}
                      onClick={() => {
                        if (blocked) {
                          void removeTimeBlock(String(blocked.id));
                          return;
                        }
                        setBlockStart(minuteToTime(minute));
                        setBlockEnd(minuteToTime(minute + 30));
                      }}
                      className={`min-h-11 rounded-xl border text-[10px] font-black transition ${
                        blocked
                          ? "border-rose-200 bg-rose-50 text-rose-700"
                          : selected
                            ? "border-violet-600 bg-violet-600 text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:border-violet-300"
                      }`}
                    >
                      {minuteToTime(minute)}
                    </button>
                  );
                },
              )}
            </div>
          </div>
        ) : null}
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {timeBlocks.map((item) => (
            <div
              key={String(item.id)}
              className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50/60 p-4"
            >
              <div>
                <b className="text-xs text-slate-800">
                  {new Intl.DateTimeFormat("fa-IR", {
                    dateStyle: "medium",
                  }).format(new Date(String(item.localDate)))}
                </b>
                <p className="mt-1 text-[10px] font-black text-rose-700">
                  {minuteToTime(Number(item.startMinute))} تا{" "}
                  {minuteToTime(Number(item.endMinute))}
                </p>
                <small className="mt-1 block text-[9px] text-slate-500">
                  {String(item.reason ?? "غیرفعال توسط مدیریت")}
                </small>
              </div>
              <button
                type="button"
                onClick={() => void removeTimeBlock(String(item.id))}
                className="mr-auto min-h-10 rounded-xl bg-white px-3 text-[9px] font-black text-emerald-700 shadow-sm"
              >
                فعال‌کردن دوباره
              </button>
            </div>
          ))}
          {!timeBlocks.length ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-center text-[10px] text-slate-400">
              بازه غیرفعالی ثبت نشده است.
            </div>
          ) : null}
        </div>
      </PageCard>
      <PageCard className="p-5">
        <h2 className="text-sm font-black">اطلاعات عمومی کسب‌وکار</h2>
        <p className="mt-1 text-[10px] text-slate-400">
          هر مقدار را مستقیماً و بدون کلید یا داده فنی تغییر دهید. تنظیم‌های
          امنیتی عمداً در این صفحه نمایش داده نمی‌شوند.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {settings.map((item) => (
            <GeneralSettingEditor
              key={String(item.id)}
              item={item}
              onSave={saveSetting}
            />
          ))}
        </div>
      </PageCard>
    </div>
  );
}

function GeneralSettingEditor({
  item,
  onSave,
}: {
  item: JsonRecord;
  onSave: (item: JsonRecord, value: unknown) => Promise<void>;
}) {
  const original = item.value;
  const isBoolean = typeof original === "boolean";
  const isNumber = typeof original === "number";
  const [value, setValue] = useState(String(original ?? ""));
  const [enabled, setEnabled] = useState(Boolean(original));
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      await onSave(
        item,
        isBoolean ? enabled : isNumber ? Number(value || 0) : value.trim(),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex min-h-7 items-center gap-2">
        <b className="text-xs">{settingLabel(item.key)}</b>
        {item.isPublic ? (
          <span className="mr-auto rounded-lg bg-emerald-50 px-2 py-1 text-[8px] font-black text-emerald-700">
            قابل نمایش در برنامه
          </span>
        ) : null}
      </div>
      {isBoolean ? (
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => setEnabled((current) => !current)}
          className={`mt-4 flex min-h-11 w-full items-center rounded-xl px-3 text-xs font-black ${enabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}
        >
          {enabled ? "فعال" : "غیرفعال"}
          <span
            className={`mr-auto h-6 w-11 rounded-full p-1 ${enabled ? "bg-emerald-500" : "bg-slate-400"}`}
          >
            <span
              className={`block size-4 rounded-full bg-white transition ${enabled ? "translate-x-0" : "-translate-x-5"}`}
            />
          </span>
        </button>
      ) : (
        <input
          dir={isNumber ? "ltr" : undefined}
          type={isNumber ? "number" : "text"}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="admin-input mt-4"
        />
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className="mt-3 min-h-10 w-full rounded-xl bg-white text-[10px] font-black text-violet-700 shadow-sm disabled:opacity-50"
      >
        {busy ? "در حال ذخیره..." : "ذخیره این تنظیم"}
      </button>
    </div>
  );
}

function ScheduleRow({
  rule,
  onSave,
}: {
  rule: JsonRecord;
  onSave: (rule: JsonRecord, patch: JsonRecord) => Promise<void>;
}) {
  const [open, setOpen] = useState(Boolean(rule.isOpen));
  const [start, setStart] = useState(minuteToTime(Number(rule.openMinute)));
  const [end, setEnd] = useState(minuteToTime(Number(rule.closeMinute)));
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 p-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`relative h-7 w-12 rounded-full ${open ? "bg-emerald-500" : "bg-slate-300"}`}
      >
        <span
          className={`absolute top-1 size-5 rounded-full bg-white transition ${open ? "right-6" : "right-1"}`}
        />
      </button>
      <b className="w-16 text-xs">{weekday(Number(rule.weekday))}</b>
      <input
        type="time"
        min="06:00"
        max="23:30"
        step="1800"
        value={start}
        onChange={(event) => setStart(event.target.value)}
        disabled={!open}
        className="admin-input min-h-10 w-28"
      />
      <span className="text-[10px] text-slate-400">تا</span>
      <input
        type="time"
        min="06:30"
        max="00:00"
        step="1800"
        value={end}
        onChange={(event) => setEnd(event.target.value)}
        disabled={!open}
        className="admin-input min-h-10 w-28"
      />
      <button
        type="button"
        onClick={() =>
          void onSave(rule, {
            isOpen: open,
            openMinute: timeToMinute(start),
            closeMinute: timeToMinute(end, true),
          })
        }
        className="mr-auto grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-700"
      >
        <Check size={15} />
      </button>
    </div>
  );
}

export function LogsView({
  data,
  range,
  onRange,
  refresh,
}: {
  data: JsonRecord;
  range: string;
  onRange: (range: string) => void;
  refresh: () => void;
}) {
  const groups = [
    {
      key: "admin",
      title: "فعالیت‌های پنل مدیریت",
      text: "ورود، ویرایش و اقدام‌های مدیر",
    },
    {
      key: "application",
      title: "فعالیت‌های وب‌اپلیکیشن",
      text: "اقدام‌های مشتری و رویدادهای برنامه",
    },
    {
      key: "security",
      title: "رویدادهای امنیتی",
      text: "ورود ناموفق و هشدارهای امنیتی پنل و برنامه",
    },
  ];
  return (
    <div className="space-y-5">
      <SectionHeading
        eyebrow="ردپای قابل بررسی"
        title="لاگ و امنیت"
        text="بازه زمانی را انتخاب و لاگ هر بخش را جداگانه مشاهده یا با یک کلیک کامل کپی کنید."
      />
      <PageCard className="flex flex-wrap items-center gap-2 p-3">
        {[
          { id: "24h", label: "۲۴ ساعت گذشته" },
          { id: "3d", label: "۳ روز گذشته" },
          { id: "7d", label: "۷ روز گذشته" },
          { id: "30d", label: "۳۰ روز گذشته" },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => onRange(item.id)}
            className={`min-h-11 flex-1 rounded-2xl px-4 text-[10px] font-black ${range === item.id ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-500"}`}
          >
            {item.label}
          </button>
        ))}
      </PageCard>
      <div className="grid gap-5 xl:grid-cols-3">
        {groups.map((group) => (
          <LogBox
            key={group.key}
            title={group.title}
            text={group.text}
            rows={arr(data[group.key])}
            refresh={refresh}
          />
        ))}
      </div>
    </div>
  );
}
function LogBox({
  title,
  text,
  rows,
  refresh,
}: {
  title: string;
  text: string;
  rows: JsonRecord[];
  refresh: () => void;
}) {
  const output = rows
    .map(
      (item) =>
        `[${dateTime(item.createdAt)}] ${actionLabel(item.action ?? item.eventType)} | ${entityLabel(item.entityType ?? item.actorType)} | ${String(item.entityId ?? item.ipAddress ?? "—")}`,
    )
    .join("\n");
  return (
    <PageCard className="overflow-hidden">
      <div className="flex items-center border-b border-slate-100 p-5">
        <div>
          <h2 className="text-sm font-black">{title}</h2>
          <p className="mt-1 text-[10px] text-slate-400">{text}</p>
        </div>
        <span className="mr-auto rounded-xl bg-slate-100 px-2 py-1 text-[9px] font-black">
          {rows.length.toLocaleString("fa-IR")}
        </span>
      </div>
      <div
        dir="ltr"
        className="h-[480px] overflow-auto bg-[#0b0d1a] p-4 text-left font-mono text-[10px] leading-6 text-slate-300"
      >
        {output || "در این بازه رویدادی ثبت نشده است."}
      </div>
      <div className="grid grid-cols-2 gap-2 p-3">
        <button
          onClick={() =>
            void navigator.clipboard
              .writeText(output)
              .then(() => showToast("تمام لاگ‌های این باکس کپی شد.", "success"))
          }
          disabled={!output}
          className="admin-primary justify-center"
        >
          <Copy size={15} />
          کپی کامل
        </button>
        <button onClick={refresh} className="admin-secondary justify-center">
          بروزرسانی
        </button>
      </div>
    </PageCard>
  );
}

function Grid({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid gap-4 sm:grid-cols-2 ${className}`}>{children}</div>
  );
}
function Field({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="grid gap-2 text-xs font-black">
      <span>{label}</span>
      <input {...props} className="admin-input" />
    </label>
  );
}
function TextArea({
  label,
  help,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  help?: string;
}) {
  return (
    <label className="grid gap-2 text-xs font-black sm:col-span-2">
      <span>{label}</span>
      <textarea {...props} className="admin-textarea" />
      {help ? (
        <small className="text-[9px] font-normal leading-5 text-slate-400">
          {help}
        </small>
      ) : null}
    </label>
  );
}
function Select({
  label,
  options,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="grid gap-2 text-xs font-black">
      <span>{label}</span>
      <select {...props} required className="admin-input">
        <option value="">انتخاب کنید</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
function CheckOption({
  children,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-black">
      <input type="checkbox" {...props} className="accent-violet-600" />
      {children}
    </label>
  );
}
function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-[9px] text-slate-400">{label}</p>
      <b className="mt-1 block text-[10px] leading-5 text-slate-700">{value}</b>
    </div>
  );
}
function localInput(value: unknown) {
  if (!value) return "";
  const date = new Date(String(value));
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}
function customerName(customer: JsonRecord) {
  return (
    `${String(customer.firstName ?? "")} ${String(customer.lastName ?? "")}`.trim() ||
    "مشتری BestWash"
  );
}
function templateName(code: unknown, templates: JsonRecord[]) {
  return String(
    templates.find((item) => item.code === code)?.title ??
      code ??
      "پیامک سامانه",
  );
}
function friendlyPayload(item: JsonRecord) {
  const payload = record(item.payload);
  return payload.purpose === "REGISTER_LOGIN"
    ? "کد یک‌بارمصرف ورود یا ثبت‌نام"
    : payload.bookingId
      ? "پیام مربوط به وضعیت رزرو"
      : "پیام سامانه";
}
function weekday(value: number) {
  return (
    ["", "شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"][
      value
    ] ?? `روز ${value}`
  );
}
function minuteToTime(value: number) {
  if (!Number.isFinite(value)) return "08:00";
  if (value === 1440) return "00:00";
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}
function timeToMinute(value: string, endOfDay = false) {
  const [hour, minute] = value.split(":").map(Number);
  if (endOfDay && hour === 0 && minute === 0) return 1440;
  return hour * 60 + minute;
}
function settingLabel(value: unknown) {
  const labels: Record<string, string> = {
    businessName: "نام کسب‌وکار",
    businessCity: "شهر فعالیت",
    supportPhone: "شماره پشتیبانی",
    supportBaleUsername: "شناسه پشتیبانی بله",
    cancellationDeadlineHours: "مهلت لغو رزرو",
    bookingReminderMinutes: "یادآوری پیش از مراجعه",
    bookingConfirmationPoints: "امتیاز تأیید رزرو",
    bookingHoldMinutes: "مدت نگه‌داشت موقت زمان رزرو",
    cashbackPercent: "درصد بازگشت وجه",
    cashbackExpiryDays: "اعتبار بازگشت وجه",
    cashbackEnabled: "بازگشت وجه",
    loyaltyEnabled: "باشگاه مشتریان",
    timezone: "منطقه زمانی",
    walletEnabled: "کیف پول",
  };
  return labels[String(value)] ?? "تنظیم عمومی";
}
