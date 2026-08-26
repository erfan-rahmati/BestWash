"use client";

/* eslint-disable @next/next/no-img-element -- media URLs are uploaded at runtime and are not known to Next image configuration. */

import {
  ArrowRight,
  BookOpenText,
  Check,
  Clipboard,
  CloudUpload,
  Eye,
  FileImage,
  ImagePlus,
  Images,
  Pencil,
  Plus,
  Save,
  Search,
  Table2,
  Trash2,
  Type,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { showToast } from "../../lib/toast";
import {
  EmptyState,
  JsonRecord,
  PageCard,
  SectionHeading,
  StatusBadge,
  adminRequest,
  arr,
  dateTime,
} from "./admin-core";

export function ContentListView({
  data,
  token,
  navigate,
  refresh,
}: {
  data: JsonRecord;
  token: string;
  navigate: (path: string) => void;
  refresh: () => void;
}) {
  const hero = arr(data.hero);
  const promo = arr(data.promo);
  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="ویترین صفحه اصلی"
        title="اسلایدر و بنر"
        text="تصاویر منتشرشده، ترتیب نمایش و مقصد هر آیتم را شفاف مدیریت کنید. تصاویر از کتابخانه رسانه انتخاب می‌شوند."
        action={
          <button
            onClick={() => navigate("media/new")}
            className="admin-primary"
          >
            <ImagePlus size={16} />
            آپلود تصویر
          </button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <ContentGroup
          title="اسلایدرهای صفحه اصلی"
          text="تصاویر چرخشی بالای صفحه اصلی"
          rows={hero}
          type="hero"
          token={token}
          onNavigate={navigate}
          onRefresh={refresh}
        />
        <ContentGroup
          title="بنر تبلیغاتی"
          text="بنر ویژه میان محتوای صفحه اصلی"
          rows={promo}
          type="promo"
          token={token}
          onNavigate={navigate}
          onRefresh={refresh}
        />
      </div>
      <PublicPagesEditor
        rows={arr(data.business)}
        token={token}
        refresh={refresh}
      />
    </div>
  );
}

function PublicPagesEditor({
  rows,
  token,
  refresh,
}: {
  rows: JsonRecord[];
  token: string;
  refresh: () => void;
}) {
  const [saving, setSaving] = useState("");
  const values = Object.fromEntries(
    rows.map((row) => [String(row.key), (row.value ?? {}) as JsonRecord]),
  );
  async function save(event: FormEvent<HTMLFormElement>, key: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const lines = (name: string) =>
      String(form.get(name) ?? "")
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean);
    let value: JsonRecord;
    if (key === "about")
      value = {
        eyebrow: form.get("eyebrow"),
        title: form.get("title"),
        description: form.get("description"),
        subtitle: form.get("subtitle"),
        body: form.get("body"),
        values: lines("values"),
        stats: lines("stats"),
      };
    else if (key === "contact")
      value = {
        eyebrow: form.get("eyebrow"),
        title: form.get("title"),
        description: form.get("description"),
        intro: form.get("intro"),
        phone: form.get("phone"),
        address: form.get("address"),
        whatsapp: form.get("whatsapp"),
        bale: form.get("bale"),
        workingHours: form.get("workingHours"),
        mapUrl: form.get("mapUrl"),
        mapEmbedUrl: form.get("mapEmbedUrl"),
      };
    else if (key === "rules")
      value = {
        eyebrow: form.get("eyebrow"),
        title: form.get("title"),
        description: form.get("description"),
        intro: form.get("intro"),
        items: lines("items"),
      };
    else
      value = {
        description: form.get("description"),
        enamadLogoUrl: form.get("enamadLogoUrl"),
        enamadVerifyUrl: form.get("enamadVerifyUrl"),
      };
    setSaving(key);
    try {
      await adminRequest(`/admin/content/business/${key}`, token, {
        method: "PUT",
        body: JSON.stringify({ data: { value, isPublic: true } }),
      });
      showToast("محتوای این صفحه در برنامه به‌روزرسانی شد.", "success");
      refresh();
    } catch (cause) {
      showToast(
        cause instanceof Error ? cause.message : "ذخیره محتوا انجام نشد.",
        "error",
      );
    } finally {
      setSaving("");
    }
  }
  const about = values.about ?? {};
  const contact = values.contact ?? {};
  const rules = values.rules ?? {};
  const footer = values.footer ?? {};
  return (
    <section className="space-y-4">
      <SectionHeading
        eyebrow="محتوای قابل ویرایش برنامه"
        title="صفحات اطلاعاتی و فوتر"
        text="تمام متن‌ها و راه‌های ارتباطی این بخش‌ها مستقیماً در وب‌اپلیکیشن نمایش داده می‌شوند؛ برای ویرایش نیازی به کدنویسی نیست."
      />
      <div className="grid gap-5 xl:grid-cols-2">
        <PublicForm
          title="صفحه درباره ما"
          saving={saving === "about"}
          onSubmit={(event) => void save(event, "about")}
        >
          <Field
            name="eyebrow"
            label="عنوان کوچک بالای صفحه"
            defaultValue={String(about.eyebrow ?? "داستان ما")}
          />
          <Field
            name="title"
            label="عنوان اصلی صفحه"
            defaultValue={String(about.title ?? "درباره BestWash")}
          />
          <TextArea
            name="description"
            label="توضیح زیر عنوان"
            defaultValue={String(about.description ?? "")}
          />
          <Field
            name="subtitle"
            label="عنوان معرفی مجموعه"
            defaultValue={String(about.subtitle ?? "")}
          />
          <TextArea
            name="body"
            label="متن معرفی"
            defaultValue={String(about.body ?? "")}
            rows={5}
          />
          <TextArea
            name="values"
            label="ارزش‌ها؛ هر مورد در یک خط"
            defaultValue={joinLines(about.values)}
            rows={4}
          />
          <TextArea
            name="stats"
            label="ویژگی‌های کوتاه؛ هر مورد در یک خط"
            defaultValue={joinLines(about.stats)}
            rows={3}
          />
        </PublicForm>
        <PublicForm
          title="صفحه تماس با ما"
          saving={saving === "contact"}
          onSubmit={(event) => void save(event, "contact")}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              name="eyebrow"
              label="عنوان کوچک"
              defaultValue={String(contact.eyebrow ?? "راه‌های ارتباطی")}
            />
            <Field
              name="title"
              label="عنوان اصلی"
              defaultValue={String(contact.title ?? "تماس با ما")}
            />
          </div>
          <TextArea
            name="description"
            label="توضیح زیر عنوان"
            defaultValue={String(contact.description ?? "")}
          />
          <TextArea
            name="intro"
            label="متن معرفی تماس"
            defaultValue={String(contact.intro ?? "")}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              name="phone"
              label="شماره تماس"
              defaultValue={String(contact.phone ?? "")}
              dir="ltr"
            />
            <Field
              name="workingHours"
              label="ساعات پاسخ‌گویی"
              defaultValue={String(contact.workingHours ?? "")}
            />
            <Field
              name="whatsapp"
              label="لینک واتساپ"
              defaultValue={String(contact.whatsapp ?? "")}
              dir="ltr"
            />
            <Field
              name="bale"
              label="لینک بله"
              defaultValue={String(contact.bale ?? "")}
              dir="ltr"
            />
          </div>
          <TextArea
            name="address"
            label="نشانی مجموعه"
            defaultValue={String(contact.address ?? "")}
          />
          <Field
            name="mapUrl"
            label="لینک مسیریابی Google Maps"
            defaultValue={String(contact.mapUrl ?? "")}
            dir="ltr"
          />
          <Field
            name="mapEmbedUrl"
            label="لینک نمایش نقشه در صفحه"
            defaultValue={String(contact.mapEmbedUrl ?? "")}
            dir="ltr"
          />
        </PublicForm>
        <PublicForm
          title="صفحه قوانین و مقررات"
          saving={saving === "rules"}
          onSubmit={(event) => void save(event, "rules")}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              name="eyebrow"
              label="عنوان کوچک"
              defaultValue={String(rules.eyebrow ?? "شفاف و روشن")}
            />
            <Field
              name="title"
              label="عنوان اصلی"
              defaultValue={String(rules.title ?? "قوانین و شرایط استفاده")}
            />
          </div>
          <TextArea
            name="description"
            label="توضیح زیر عنوان"
            defaultValue={String(rules.description ?? "")}
          />
          <TextArea
            name="intro"
            label="متن معرفی قوانین"
            defaultValue={String(rules.intro ?? "")}
          />
          <TextArea
            name="items"
            label="قوانین؛ هر قانون در یک خط"
            defaultValue={joinLines(rules.items)}
            rows={9}
          />
        </PublicForm>
        <PublicForm
          title="فوتر وب‌اپلیکیشن"
          saving={saving === "footer"}
          onSubmit={(event) => void save(event, "footer")}
        >
          <TextArea
            name="description"
            label="توضیح کوتاه BestWash"
            defaultValue={String(footer.description ?? "")}
            rows={4}
          />
          <Field
            name="enamadLogoUrl"
            label="لینک تصویر نماد اعتماد"
            defaultValue={String(footer.enamadLogoUrl ?? "")}
            dir="ltr"
          />
          <Field
            name="enamadVerifyUrl"
            label="لینک صفحه استعلام نماد"
            defaultValue={String(footer.enamadVerifyUrl ?? "")}
            dir="ltr"
          />
          <p className="rounded-2xl bg-amber-50 p-4 text-[10px] leading-6 text-amber-800">
            تا پیش از دریافت اینماد، جایگاه استاندارد نماد در فوتر نمایش داده
            می‌شود. پس از دریافت، دو لینک بالا را وارد کنید.
          </p>
        </PublicForm>
      </div>
    </section>
  );
}

function PublicForm({
  title,
  saving,
  onSubmit,
  children,
}: {
  title: string;
  saving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <PageCard className="p-5">
      <form onSubmit={onSubmit} className="space-y-4">
        <h3 className="text-sm font-black text-slate-900">{title}</h3>
        {children}
        <button
          disabled={saving}
          className="admin-primary w-full justify-center"
        >
          <Save size={16} />
          {saving ? "در حال ذخیره..." : "ذخیره و اعمال در برنامه"}
        </button>
      </form>
    </PageCard>
  );
}

function joinLines(value: unknown) {
  return Array.isArray(value) ? value.join("\n") : "";
}
function ContentGroup({
  title,
  text,
  rows,
  type,
  token,
  onNavigate,
  onRefresh,
}: {
  title: string;
  text: string;
  rows: JsonRecord[];
  type: "hero" | "promo";
  token: string;
  onNavigate: (path: string) => void;
  onRefresh: () => void;
}) {
  async function remove(item: JsonRecord) {
    if (!window.confirm("این تصویر از ویترین حذف شود؟")) return;
    try {
      await adminRequest(`/admin/content/${type}/${String(item.id)}`, token, {
        method: "DELETE",
      });
      showToast("آیتم از ویترین حذف شد.", "success");
      onRefresh();
    } catch (cause) {
      showToast(
        cause instanceof Error ? cause.message : "حذف انجام نشد.",
        "error",
      );
    }
  }
  return (
    <PageCard className="overflow-hidden">
      <div className="flex items-center gap-3 border-b border-slate-100 p-5">
        <div>
          <h2 className="text-sm font-black">{title}</h2>
          <p className="mt-1 text-[10px] text-slate-400">{text}</p>
        </div>
        <button
          onClick={() => onNavigate(`content/new/${type}`)}
          className="mr-auto flex min-h-10 items-center gap-1 rounded-xl bg-violet-600 px-3 text-[10px] font-black text-white"
        >
          <Plus size={14} />
          افزودن
        </button>
      </div>
      <div className="grid gap-3 p-4">
        {rows.map((item) => (
          <div
            key={String(item.id)}
            className="group grid gap-3 rounded-2xl border border-slate-200 p-3 sm:grid-cols-[130px_1fr_auto] sm:items-center"
          >
            <div
              role="img"
              aria-label={String(item.altText ?? "تصویر ویترین")}
              className="h-20 overflow-hidden rounded-xl bg-slate-100 bg-cover bg-center"
              style={{ backgroundImage: `url(${String(item.imageUrl)})` }}
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <b className="truncate text-xs">{String(item.altText)}</b>
                <StatusBadge value={item.isActive ? "ACTIVE" : "DRAFT"} />
              </div>
              <p
                dir="ltr"
                className="mt-2 truncate text-left text-[9px] text-slate-400"
              >
                {String(item.imageUrl)}
              </p>
              <p className="mt-1 text-[9px] text-slate-400">
                مقصد: {String(item.linkValue ?? "بدون لینک")}
              </p>
            </div>
            <div className="flex gap-2 sm:flex-col">
              <button
                onClick={() =>
                  onNavigate(`content/edit/${String(item.id)}/${type}`)
                }
                className="flex min-h-10 items-center gap-1 rounded-xl bg-violet-50 px-3 text-[10px] font-black text-violet-700"
              >
                <Pencil size={14} />
                ویرایش
              </button>
              <button
                onClick={() => void remove(item)}
                className="flex min-h-10 items-center gap-1 rounded-xl bg-rose-50 px-3 text-[10px] font-black text-rose-700"
              >
                <Trash2 size={14} />
                حذف
              </button>
            </div>
          </div>
        ))}
        {!rows.length ? (
          <EmptyState title="آیتمی برای این بخش ثبت نشده است" />
        ) : null}
      </div>
    </PageCard>
  );
}

export function ContentEditorView({
  route,
  data,
  media,
  token,
  navigate,
  refresh,
}: {
  route: string;
  data: JsonRecord;
  media: JsonRecord[];
  token: string;
  navigate: (path: string) => void;
  refresh: () => void;
}) {
  const parts = route.split("/");
  const isEdit = parts[1] === "edit";
  const id = isEdit ? parts[2] : "";
  const type = (isEdit ? parts[3] : parts[2]) as "hero" | "promo";
  const items = type === "promo" ? arr(data.promo) : arr(data.hero);
  const current = items.find((item) => String(item.id) === id) ?? {};
  const [imageUrl, setImageUrl] = useState(
    String(current.imageUrl ?? media[0]?.url ?? ""),
  );
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await adminRequest(
        `/admin/content/${type}${isEdit ? `/${id}` : ""}`,
        token,
        {
          method: isEdit ? "PUT" : "POST",
          body: JSON.stringify({
            data: {
              imageUrl,
              altText: form.get("altText"),
              linkType: form.get("linkValue") ? "INTERNAL" : "NONE",
              linkValue: form.get("linkValue") || null,
              sortOrder: Number(form.get("sortOrder") ?? 0),
              isActive: form.get("isActive") === "on",
            },
          }),
        },
      );
      showToast("محتوای ویترین ذخیره شد.", "success");
      refresh();
      navigate("content");
    } catch (cause) {
      showToast(
        cause instanceof Error ? cause.message : "ذخیره انجام نشد.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto max-w-5xl">
      <SectionHeading
        eyebrow={type === "hero" ? "اسلایدر صفحه اصلی" : "بنر تبلیغاتی"}
        title={isEdit ? "ویرایش محتوا" : "افزودن محتوای جدید"}
        text="تصویر را از رسانه‌های آپلودشده انتخاب کنید و مقصد نمایش را مشخص نمایید."
        action={
          <button
            onClick={() => navigate("content")}
            className="admin-secondary"
          >
            <ArrowRight size={15} />
            بازگشت
          </button>
        }
      />
      <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1fr_.8fr]">
        <PageCard className="p-5">
          <h3 className="text-sm font-black">اطلاعات نمایش</h3>
          <div className="mt-5 space-y-4">
            <Field
              name="altText"
              label="عنوان و متن جایگزین تصویر"
              defaultValue={String(current.altText ?? "")}
              required
            />
            <Field
              name="linkValue"
              label="صفحه مقصد (اختیاری)"
              defaultValue={String(current.linkValue ?? "")}
              placeholder="/booking"
              dir="ltr"
            />
            <Field
              name="sortOrder"
              label="اولویت نمایش"
              type="number"
              defaultValue={String(current.sortOrder ?? 10)}
            />
            <label className="flex items-center gap-2 rounded-2xl bg-slate-50 p-4 text-xs font-black">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={current.isActive !== false}
                className="size-4 accent-violet-600"
              />
              همین حالا در برنامه نمایش داده شود
            </label>
          </div>
          <button
            disabled={busy || !imageUrl}
            className="admin-primary mt-5 w-full justify-center"
          >
            <Save size={16} />
            {busy ? "در حال ذخیره..." : "ذخیره و انتشار"}
          </button>
        </PageCard>
        <PageCard className="p-5">
          <h3 className="text-sm font-black">انتخاب تصویر از رسانه‌ها</h3>
          <div className="mt-4 max-h-[520px] grid-cols-2 gap-2 overflow-y-auto sm:grid">
            {media.map((item) => (
              <button
                type="button"
                key={String(item.id)}
                onClick={() => setImageUrl(String(item.url))}
                className={`overflow-hidden rounded-2xl border p-2 text-right ${imageUrl === item.url ? "border-violet-500 bg-violet-50" : "border-slate-200"}`}
              >
                <div className="relative h-28 overflow-hidden rounded-xl bg-slate-100">
                  <img
                    src={String(item.url)}
                    alt={String(item.altText ?? item.title ?? "")}
                    className="h-full w-full object-cover"
                  />
                </div>
                <b className="mt-2 block truncate text-[10px]">
                  {String(item.title ?? item.altText ?? item.fileName)}
                </b>
                {imageUrl === item.url ? (
                  <span className="mt-1 flex items-center gap-1 text-[9px] font-black text-violet-700">
                    <Check size={12} />
                    انتخاب شده
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          {!media.length ? (
            <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-xs leading-6 text-amber-800">
              ابتدا در بخش رسانه‌ها تصویر را آپلود کنید.
            </div>
          ) : null}
        </PageCard>
      </form>
    </div>
  );
}

export function MediaListView({
  rows,
  token,
  navigate,
  refresh,
}: {
  rows: JsonRecord[];
  token: string;
  navigate: (path: string) => void;
  refresh: () => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () =>
      rows.filter((item) =>
        JSON.stringify(item).toLowerCase().includes(query.toLowerCase()),
      ),
    [query, rows],
  );
  async function remove(id: string) {
    if (!confirm("این رسانه از کتابخانه حذف شود؟")) return;
    try {
      await adminRequest(`/admin/catalog/media-assets/${id}`, token, {
        method: "DELETE",
      });
      showToast("رسانه حذف شد.", "success");
      refresh();
    } catch (cause) {
      showToast(
        cause instanceof Error ? cause.message : "حذف انجام نشد.",
        "error",
      );
    }
  }
  return (
    <div className="space-y-5">
      <SectionHeading
        eyebrow="دارایی‌های تصویری"
        title="رسانه‌ها"
        text="تصاویر را یک‌بار آپلود کنید، نشانی امن آن‌ها را کپی کنید و در اسلایدر، بنر یا مقاله به کار ببرید."
        action={
          <button
            onClick={() => navigate("media/new")}
            className="admin-primary"
          >
            <CloudUpload size={16} />
            افزودن رسانه
          </button>
        }
      />
      <PageCard className="p-3">
        <label className="flex min-h-12 items-center gap-2 rounded-2xl bg-slate-50 px-4">
          <Search size={18} className="text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full bg-transparent text-xs outline-none"
            placeholder="جست‌وجوی عنوان یا نام فایل"
          />
        </label>
      </PageCard>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {filtered.map((item) => (
          <PageCard key={String(item.id)} className="group overflow-hidden">
            <div className="relative h-48 overflow-hidden bg-slate-100">
              <img
                src={String(item.url)}
                alt={String(item.altText ?? "")}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
            </div>
            <div className="p-4">
              <b className="block truncate text-xs">
                {String(item.title ?? item.altText ?? item.fileName)}
              </b>
              <p className="mt-1 truncate text-[9px] text-slate-400">
                {String(item.fileName)} ·{" "}
                {(Number(item.sizeBytes ?? 0) / 1024).toLocaleString("fa-IR", {
                  maximumFractionDigits: 0,
                })}{" "}
                کیلوبایت
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <button
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(String(item.url))
                      .then(() => showToast("نشانی رسانه کپی شد.", "success"))
                  }
                  title="کپی نشانی"
                  className="grid min-h-10 place-items-center rounded-xl bg-violet-50 text-violet-700"
                >
                  <Clipboard size={15} />
                </button>
                <button
                  onClick={() => navigate(`media/edit/${String(item.id)}`)}
                  title="ویرایش"
                  className="grid min-h-10 place-items-center rounded-xl bg-slate-100 text-slate-600"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => void remove(String(item.id))}
                  title="حذف"
                  className="grid min-h-10 place-items-center rounded-xl bg-rose-50 text-rose-600"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </PageCard>
        ))}
      </div>
      {!filtered.length ? (
        <PageCard>
          <EmptyState title="رسانه‌ای پیدا نشد" />
        </PageCard>
      ) : null}
    </div>
  );
}

export function MediaEditorView({
  route,
  rows,
  token,
  navigate,
  refresh,
}: {
  route: string;
  rows: JsonRecord[];
  token: string;
  navigate: (path: string) => void;
  refresh: () => void;
}) {
  const parts = route.split("/");
  const isEdit = parts[1] === "edit";
  const current = rows.find((item) => String(item.id) === parts[2]) ?? {};
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(String(current.url ?? ""));
  const [busy, setBusy] = useState(false);
  async function choose(next: File | null) {
    setFile(next);
    if (next) setPreview(URL.createObjectURL(next));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      if (isEdit) {
        await adminRequest(
          `/admin/catalog/media-assets/${String(current.id)}`,
          token,
          {
            method: "PUT",
            body: JSON.stringify({
              data: { title: form.get("title"), altText: form.get("altText") },
            }),
          },
        );
      } else {
        if (!file) throw new Error("یک تصویر انتخاب کنید.");
        const dataUrl = await fileToDataUrl(file);
        await adminRequest("/admin/media/upload", token, {
          method: "POST",
          body: JSON.stringify({
            fileName: file.name,
            dataUrl,
            title: form.get("title"),
            altText: form.get("altText"),
          }),
        });
      }
      showToast("رسانه با موفقیت ذخیره شد.", "success");
      refresh();
      navigate("media");
    } catch (cause) {
      showToast(
        cause instanceof Error ? cause.message : "آپلود انجام نشد.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto max-w-4xl">
      <SectionHeading
        eyebrow="کتابخانه رسانه"
        title={isEdit ? "ویرایش مشخصات رسانه" : "آپلود رسانه جدید"}
        text="فرمت‌های PNG، JPG، WebP یا GIF تا سقف ۵ مگابایت پذیرفته می‌شوند."
        action={
          <button onClick={() => navigate("media")} className="admin-secondary">
            <ArrowRight size={15} />
            بازگشت
          </button>
        }
      />
      <form onSubmit={submit} className="grid gap-6 md:grid-cols-2">
        <PageCard className="p-5">
          <div className="grid min-h-72 place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50">
            {preview ? (
              <img
                src={preview}
                alt="پیش‌نمایش"
                className="max-h-80 w-full object-contain"
              />
            ) : (
              <div className="text-center text-slate-400">
                <FileImage className="mx-auto" size={36} />
                <p className="mt-3 text-xs">پیش‌نمایش تصویر</p>
              </div>
            )}
          </div>
          {!isEdit ? (
            <label className="admin-secondary mt-4 w-full cursor-pointer justify-center">
              <CloudUpload size={16} />
              انتخاب فایل
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(event) =>
                  void choose(event.target.files?.[0] ?? null)
                }
                className="hidden"
              />
            </label>
          ) : null}
        </PageCard>
        <PageCard className="p-5">
          <div className="space-y-4">
            <Field
              name="title"
              label="عنوان قابل فهم رسانه"
              defaultValue={String(current.title ?? "")}
              required
            />
            <Field
              name="altText"
              label="توضیح تصویر برای دسترس‌پذیری"
              defaultValue={String(current.altText ?? "")}
              required
            />
            {isEdit ? (
              <div>
                <p className="text-[10px] font-black text-slate-500">
                  نشانی فعلی
                </p>
                <p
                  dir="ltr"
                  className="mt-2 break-all rounded-2xl bg-slate-50 p-3 text-left text-[9px] text-slate-500"
                >
                  {String(current.url)}
                </p>
              </div>
            ) : null}
          </div>
          <button
            disabled={busy || (!isEdit && !file)}
            className="admin-primary mt-5 w-full justify-center"
          >
            <Save size={16} />
            {busy ? "در حال بارگذاری..." : "ذخیره رسانه"}
          </button>
        </PageCard>
      </form>
    </div>
  );
}

type RichBlock = {
  id: string;
  type: "paragraph" | "heading" | "image" | "table";
  content: string;
  url?: string;
  alt?: string;
  rows?: string[][];
};
function parseBlocks(content: unknown): RichBlock[] {
  try {
    const parsed = JSON.parse(String(content));
    if (Array.isArray(parsed)) return parsed as RichBlock[];
  } catch {}
  return String(content ?? "")
    .split(/\n\n+/)
    .filter(Boolean)
    .map((text, index) => ({
      id: `legacy-${index}`,
      type: "paragraph",
      content: text,
    }));
}
export function ArticlesListView({
  rows,
  token,
  navigate,
  refresh,
}: {
  rows: JsonRecord[];
  token: string;
  navigate: (path: string) => void;
  refresh: () => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const filtered = useMemo(
    () =>
      rows.filter(
        (item) =>
          (status === "ALL" ||
            (status === "PUBLISHED" ? item.isPublished : !item.isPublished)) &&
          JSON.stringify(item).toLowerCase().includes(query.toLowerCase()),
      ),
    [query, rows, status],
  );
  async function remove(id: string) {
    if (!confirm("مقاله برای همیشه حذف شود؟")) return;
    try {
      await adminRequest(`/admin/catalog/blog-posts/${id}`, token, {
        method: "DELETE",
      });
      showToast("مقاله حذف شد.", "success");
      refresh();
    } catch (cause) {
      showToast(
        cause instanceof Error ? cause.message : "حذف انجام نشد.",
        "error",
      );
    }
  }
  return (
    <div className="space-y-5">
      <SectionHeading
        eyebrow="مجله BestWash"
        title="مقالات"
        text="مقاله‌ها را به صورت پیش‌نویس آماده، پیش‌نمایش و سپس منتشر کنید."
        action={
          <button
            onClick={() => navigate("articles/new")}
            className="admin-primary"
          >
            <Plus size={16} />
            مقاله جدید
          </button>
        }
      />
      <PageCard className="p-3">
        <div className="grid gap-2 md:grid-cols-[1fr_200px]">
          <label className="flex min-h-12 items-center gap-2 rounded-2xl bg-slate-50 px-4">
            <Search size={17} className="text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full bg-transparent text-xs outline-none"
              placeholder="جست‌وجوی عنوان، دسته‌بندی یا نشانی مقاله"
            />
          </label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-2xl border-0 bg-slate-50 px-4 text-xs font-bold"
          >
            <option value="ALL">همه وضعیت‌ها</option>
            <option value="PUBLISHED">منتشر شده</option>
            <option value="DRAFT">پیش‌نویس</option>
          </select>
        </div>
      </PageCard>
      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((post) => (
          <PageCard key={String(post.id)} className="overflow-hidden">
            <div className="grid sm:grid-cols-[190px_1fr]">
              <div className="h-48 bg-slate-100 sm:h-full">
                {post.coverImageUrl ? (
                  <img
                    src={String(post.coverImageUrl)}
                    alt={String(post.coverImageAlt ?? post.title)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-slate-300">
                    <BookOpenText size={38} />
                  </div>
                )}
              </div>
              <div className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    value={post.isPublished ? "PUBLISHED" : "DRAFT"}
                  />
                  <span className="text-[9px] text-slate-400">
                    {String(post.category ?? "مجله BestWash")}
                  </span>
                </div>
                <h2 className="mt-3 line-clamp-2 text-sm font-black leading-7">
                  {String(post.title)}
                </h2>
                <p className="mt-2 line-clamp-2 text-[10px] leading-6 text-slate-500">
                  {String(post.excerpt)}
                </p>
                <p className="mt-3 text-[9px] text-slate-400">
                  آخرین ویرایش: {dateTime(post.updatedAt)}
                </p>
                <div className="mt-4 flex gap-2">
                  <a
                    href={`/blog/${String(post.slug)}`}
                    target="_blank"
                    className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-600"
                  >
                    <Eye size={15} />
                  </a>
                  <button
                    onClick={() => navigate(`articles/edit/${String(post.id)}`)}
                    className="flex min-h-10 flex-1 items-center justify-center gap-1 rounded-xl bg-violet-50 text-[10px] font-black text-violet-700"
                  >
                    <Pencil size={14} />
                    ویرایش
                  </button>
                  <button
                    onClick={() => void remove(String(post.id))}
                    className="grid size-10 place-items-center rounded-xl bg-rose-50 text-rose-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          </PageCard>
        ))}
      </div>
      {!filtered.length ? (
        <PageCard>
          <EmptyState title="مقاله‌ای پیدا نشد" />
        </PageCard>
      ) : null}
    </div>
  );
}

export function ArticleEditorView({
  route,
  rows,
  media,
  token,
  navigate,
  refresh,
}: {
  route: string;
  rows: JsonRecord[];
  media: JsonRecord[];
  token: string;
  navigate: (path: string) => void;
  refresh: () => void;
}) {
  const parts = route.split("/");
  const isEdit = parts[1] === "edit";
  const current = rows.find((item) => String(item.id) === parts[2]) ?? {};
  const [blocks, setBlocks] = useState<RichBlock[]>(
    parseBlocks(current.content),
  );
  const [cover, setCover] = useState(String(current.coverImageUrl ?? ""));
  const [published, setPublished] = useState(Boolean(current.isPublished));
  const [busy, setBusy] = useState(false);
  function addBlock(type: RichBlock["type"]) {
    setBlocks((value) => [
      ...value,
      {
        id: crypto.randomUUID(),
        type,
        content: "",
        ...(type === "table"
          ? {
              rows: [
                ["ستون اول", "ستون دوم"],
                ["مقدار اول", "مقدار دوم"],
              ],
            }
          : {}),
      },
    ]);
  }
  function updateBlock(id: string, patch: Partial<RichBlock>) {
    setBlocks((value) =>
      value.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const data = {
        title: form.get("title"),
        slug: String(form.get("slug") ?? "")
          .trim()
          .toLowerCase(),
        excerpt: form.get("excerpt"),
        category: form.get("category") || null,
        content: JSON.stringify(blocks),
        coverImageUrl: cover || null,
        coverImageAlt: form.get("coverImageAlt") || null,
        seoTitle: form.get("seoTitle") || null,
        seoDescription: form.get("seoDescription") || null,
        readingMinutes: Number(form.get("readingMinutes") ?? 4),
        isPublished: published,
        publishedAt: published
          ? (current.publishedAt ?? new Date().toISOString())
          : null,
      };
      await adminRequest(
        `/admin/catalog/blog-posts${isEdit ? `/${String(current.id)}` : ""}`,
        token,
        { method: isEdit ? "PUT" : "POST", body: JSON.stringify({ data }) },
      );
      showToast("مقاله ذخیره شد.", "success");
      refresh();
      navigate("articles");
    } catch (cause) {
      showToast(
        cause instanceof Error ? cause.message : "ذخیره مقاله انجام نشد.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto max-w-[1280px]">
      <SectionHeading
        eyebrow={isEdit ? "ویرایش محتوا" : "محتوای جدید"}
        title={isEdit ? String(current.title ?? "ویرایش مقاله") : "ساخت مقاله"}
        text="محتوا را بخش‌بندی کنید؛ تیتر، تصویر و جدول دقیقاً در همان محل در صفحه مقاله نمایش داده می‌شوند."
        action={
          <button
            onClick={() => navigate("articles")}
            className="admin-secondary"
          >
            <ArrowRight size={15} />
            بازگشت به مقالات
          </button>
        }
      />
      <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1fr_330px]">
        <div className="space-y-5">
          <PageCard className="p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                name="title"
                label="عنوان اصلی مقاله"
                defaultValue={String(current.title ?? "")}
                required
              />
              <Field
                name="slug"
                label="نشانی انگلیسی مقاله"
                defaultValue={String(current.slug ?? "")}
                dir="ltr"
                required
              />
              <Field
                name="category"
                label="دسته‌بندی"
                defaultValue={String(current.category ?? "")}
              />
              <Field
                name="readingMinutes"
                label="زمان مطالعه (دقیقه)"
                type="number"
                min="1"
                defaultValue={String(current.readingMinutes ?? 4)}
              />
              <label className="grid gap-2 text-xs font-black sm:col-span-2">
                خلاصه کارت مقاله
                <textarea
                  name="excerpt"
                  rows={3}
                  defaultValue={String(current.excerpt ?? "")}
                  required
                  className="admin-textarea"
                />
              </label>
            </div>
          </PageCard>
          <PageCard className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <div>
                <h3 className="text-sm font-black">محتوای مقاله</h3>
                <p className="mt-1 text-[10px] text-slate-400">
                  ترتیب بلوک‌ها، ترتیب نمایش در مقاله است.
                </p>
              </div>
              <div className="mr-auto flex flex-wrap gap-1">
                <Tool onClick={() => addBlock("heading")} icon={Type}>
                  تیتر
                </Tool>
                <Tool onClick={() => addBlock("paragraph")} icon={BookOpenText}>
                  متن
                </Tool>
                <Tool onClick={() => addBlock("image")} icon={Images}>
                  تصویر
                </Tool>
                <Tool onClick={() => addBlock("table")} icon={Table2}>
                  جدول
                </Tool>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {blocks.map((block, index) => (
                <BlockEditor
                  key={block.id}
                  block={block}
                  media={media}
                  onChange={(patch) => updateBlock(block.id, patch)}
                  onDelete={() =>
                    setBlocks((value) =>
                      value.filter((item) => item.id !== block.id),
                    )
                  }
                  index={index}
                />
              ))}
            </div>
            {!blocks.length ? (
              <button
                type="button"
                onClick={() => addBlock("paragraph")}
                className="mt-4 min-h-28 w-full rounded-2xl border-2 border-dashed border-slate-200 text-xs font-black text-slate-400"
              >
                برای شروع یک بلوک متن اضافه کنید
              </button>
            ) : null}
          </PageCard>
        </div>
        <aside className="space-y-5">
          <PageCard className="p-5">
            <h3 className="text-sm font-black">انتشار</h3>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPublished(false)}
                className={`min-h-11 rounded-xl text-xs font-black ${!published ? "bg-slate-900 text-white" : "bg-slate-100"}`}
              >
                پیش‌نویس
              </button>
              <button
                type="button"
                onClick={() => setPublished(true)}
                className={`min-h-11 rounded-xl text-xs font-black ${published ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700"}`}
              >
                منتشر شود
              </button>
            </div>
            <button
              disabled={busy}
              className="admin-primary mt-4 w-full justify-center"
            >
              <Save size={16} />
              {busy ? "در حال ذخیره..." : "ذخیره مقاله"}
            </button>
          </PageCard>
          <PageCard className="p-5">
            <h3 className="text-sm font-black">تصویر شاخص</h3>
            {cover ? (
              <img
                src={cover}
                alt="تصویر شاخص"
                className="mt-4 h-44 w-full rounded-2xl object-cover"
              />
            ) : null}
            <label className="mt-4 grid gap-2 text-xs font-black">
              انتخاب از رسانه‌ها
              <select
                value={cover}
                onChange={(event) => setCover(event.target.value)}
                className="admin-input"
              >
                <option value="">بدون تصویر</option>
                {media.map((item) => (
                  <option key={String(item.id)} value={String(item.url)}>
                    {String(item.title ?? item.fileName)}
                  </option>
                ))}
              </select>
            </label>
            <Field
              name="coverImageAlt"
              label="توضیح تصویر شاخص"
              defaultValue={String(current.coverImageAlt ?? "")}
            />
          </PageCard>
          <PageCard className="p-5">
            <h3 className="text-sm font-black">بهینه‌سازی جست‌وجو</h3>
            <div className="mt-4 space-y-4">
              <Field
                name="seoTitle"
                label="عنوان SEO"
                defaultValue={String(current.seoTitle ?? "")}
              />
              <label className="grid gap-2 text-xs font-black">
                توضیح متا
                <textarea
                  name="seoDescription"
                  rows={4}
                  defaultValue={String(current.seoDescription ?? "")}
                  className="admin-textarea"
                />
              </label>
            </div>
          </PageCard>
        </aside>
      </form>
    </div>
  );
}

function BlockEditor({
  block,
  media,
  onChange,
  onDelete,
  index,
}: {
  block: RichBlock;
  media: JsonRecord[];
  onChange: (patch: Partial<RichBlock>) => void;
  onDelete: () => void;
  index: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="mb-3 flex items-center">
        <span className="rounded-lg bg-white px-2 py-1 text-[9px] font-black text-slate-500">
          بخش {(index + 1).toLocaleString("fa-IR")} ·{" "}
          {
            (
              {
                paragraph: "متن",
                heading: "تیتر",
                image: "تصویر",
                table: "جدول",
              } as Record<string, string>
            )[block.type]
          }
        </span>
        <button
          type="button"
          onClick={onDelete}
          className="mr-auto text-rose-500"
        >
          <Trash2 size={15} />
        </button>
      </div>
      {block.type === "heading" ? (
        <input
          value={block.content}
          onChange={(event) => onChange({ content: event.target.value })}
          className="admin-input text-base font-black"
          placeholder="عنوان این بخش"
        />
      ) : block.type === "paragraph" ? (
        <textarea
          value={block.content}
          onChange={(event) => onChange({ content: event.target.value })}
          rows={6}
          className="admin-textarea"
          placeholder="متن پاراگراف..."
        />
      ) : block.type === "image" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2 text-xs font-black">
            تصویر
            <select
              value={block.url ?? ""}
              onChange={(event) => onChange({ url: event.target.value })}
              className="admin-input"
            >
              <option value="">انتخاب رسانه</option>
              {media.map((item) => (
                <option key={String(item.id)} value={String(item.url)}>
                  {String(item.title ?? item.fileName)}
                </option>
              ))}
            </select>
          </label>
          <FieldValue
            label="توضیح تصویر"
            value={block.alt ?? ""}
            onChange={(alt) => onChange({ alt })}
          />
          {block.url ? (
            <img
              src={block.url}
              alt={block.alt ?? ""}
              className="h-44 w-full rounded-xl object-cover sm:col-span-2"
            />
          ) : null}
        </div>
      ) : (
        <TableEditor
          rows={block.rows ?? [["ستون اول", "ستون دوم"]]}
          onChange={(rows) => onChange({ rows })}
        />
      )}
    </div>
  );
}
function TableEditor({
  rows,
  onChange,
}: {
  rows: string[][];
  onChange: (rows: string[][]) => void;
}) {
  const width = Math.max(2, ...rows.map((row) => row.length));
  function cell(r: number, c: number, value: string) {
    onChange(
      rows.map((row, index) =>
        index === r
          ? Array.from({ length: width }, (_, column) =>
              column === c ? value : (row[column] ?? ""),
            )
          : row,
      ),
    );
  }
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[460px]">
          <tbody>
            {rows.map((row, r) => (
              <tr key={r}>
                {Array.from({ length: width }, (_, c) => (
                  <td key={c} className="p-1">
                    <input
                      value={row[c] ?? ""}
                      onChange={(event) => cell(r, c, event.target.value)}
                      className="admin-input min-h-10"
                      placeholder={r === 0 ? "عنوان ستون" : "مقدار"}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => onChange([...rows, Array(width).fill("")])}
          className="rounded-xl bg-white px-3 py-2 text-[9px] font-black"
        >
          افزودن ردیف
        </button>
        <button
          type="button"
          onClick={() => onChange(rows.map((row) => [...row, ""]))}
          className="rounded-xl bg-white px-3 py-2 text-[9px] font-black"
        >
          افزودن ستون
        </button>
      </div>
    </div>
  );
}
function Tool({
  onClick,
  icon: Icon,
  children,
}: {
  onClick: () => void;
  icon: typeof Type;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-9 items-center gap-1 rounded-xl bg-slate-100 px-3 text-[9px] font-black text-slate-600"
    >
      <Icon size={13} />
      {children}
    </button>
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
function TextArea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string },
) {
  const { label, ...textarea } = props;
  return (
    <label className="grid gap-2 text-xs font-black">
      <span>{label}</span>
      <textarea {...textarea} className="admin-input min-h-24 resize-y" />
    </label>
  );
}
function FieldValue({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-xs font-black">
      <span>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="admin-input"
      />
    </label>
  );
}
function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("خواندن فایل انجام نشد."));
    reader.readAsDataURL(file);
  });
}
