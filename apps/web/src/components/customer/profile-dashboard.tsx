"use client";

import Link from "next/link";
import {
  Bell,
  BookOpen,
  ChevronLeft,
  CircleHelp,
  FileText,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Mail,
  Save,
  Settings,
  ShieldCheck,
  Star,
  UserRound,
  WalletCards,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AuthPanel } from "../auth/auth-panel";
import {
  getMe,
  logout,
  type CustomerProfile,
  updateProfile,
} from "../../lib/api/account";
import { PersianBirthDate } from "./persian-birth-date";
import { showToast } from "../../lib/toast";

const menu = [
  { href: "/profile/security", label: "امنیت و رمز عبور", icon: LockKeyhole },
  { href: "/notifications", label: "اعلان‌ها", icon: Bell },
  { href: "/settings", label: "تنظیمات و ترجیحات", icon: Settings },
  { href: "/support", label: "پشتیبانی و درخواست‌ها", icon: CircleHelp },
  { href: "/blog", label: "مقالات BestWash", icon: BookOpen },
  { href: "/about", label: "درباره BestWash", icon: BookOpen },
  { href: "/contact", label: "تماس با ما", icon: Mail },
  { href: "/rules", label: "قوانین و شرایط", icon: FileText },
] as const;

export function ProfileDashboard() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");

  function applyProfile(value: CustomerProfile) {
    setProfile(value);
    setFirstName(value.firstName ?? "");
    setLastName(value.lastName ?? "");
    setEmail(value.email ?? "");
    setBirthDate(value.birthDate?.slice(0, 10) ?? "");
  }

  useEffect(() => {
    getMe()
      .then(applyProfile)
      .catch(() => null)
      .finally(() => setLoaded(true));
  }, []);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const updated = await updateProfile({
        firstName,
        lastName,
        email: email.trim() || undefined,
        birthDate: birthDate || undefined,
      });
      applyProfile(updated);
      setEditing(false);
      setMessage("اطلاعات پروفایل ذخیره شد.");
      showToast("اطلاعات پروفایل ذخیره شد.", "success");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "ذخیره اطلاعات انجام نشد.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!loaded)
    return (
      <div className="flex min-h-52 items-center justify-center">
        <LoaderCircle className="animate-spin text-blue-600" />
      </div>
    );
  if (!profile) return <AuthPanel onAuthenticated={applyProfile} />;

  const fullName =
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
    "کاربر عزیز";
  const jalaliBirthDate = birthDate
    ? new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date(`${birthDate}T12:00:00Z`))
    : null;
  return (
    <div>
      {message ? (
        <p
          role="status"
          className="mb-4 rounded-[14px] bg-emerald-50 p-3 text-[11px] text-emerald-700"
        >
          {message}
        </p>
      ) : null}
      <div className="rounded-[26px] border border-[var(--bw-border)] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-blue-50 text-blue-600">
            <UserRound size={25} />
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-black text-slate-800">{fullName}</p>
            <p dir="ltr" className="mt-1 text-left text-[11px] text-slate-500">
              {profile.mobile}
            </p>
          </div>
          <button
            onClick={() => setEditing((value) => !value)}
            className="mr-auto min-h-10 rounded-[12px] bg-blue-50 px-3 text-[10px] font-black text-blue-700"
          >
            {editing ? "بستن" : "ویرایش"}
          </button>
        </div>
        {editing ? (
          <div className="mt-5 border-t border-dashed border-slate-200 pt-5">
            <div className="grid grid-cols-2 gap-3">
              <Field label="نام" value={firstName} onChange={setFirstName} />
              <Field
                label="نام خانوادگی"
                value={lastName}
                onChange={setLastName}
              />
            </div>
            <div className="mt-3">
              <Field
                label="ایمیل"
                value={email}
                onChange={(value) =>
                  setEmail(value.replace(/[^\x20-\x7E]/g, ""))
                }
                type="email"
              />
            </div>
            <PersianBirthDate value={birthDate} onChange={setBirthDate} />
            {jalaliBirthDate ? (
              <p className="mt-2 text-[10px] font-bold text-blue-700">
                تاریخ انتخاب‌شده: {jalaliBirthDate}
              </p>
            ) : null}
            <button
              disabled={saving || !firstName.trim() || !lastName.trim()}
              onClick={() => void save()}
              className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-blue-600 text-[12px] font-black text-white disabled:opacity-50"
            >
              {saving ? (
                <LoaderCircle size={17} className="animate-spin" />
              ) : (
                <Save size={17} />
              )}
              ذخیره اطلاعات
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link
          href="/wallet"
          className="rounded-[20px] border border-blue-100 bg-blue-50 p-4"
        >
          <WalletCards className="text-blue-600" />
          <p className="mt-3 text-[11px] font-black text-slate-700">کیف پول</p>
          <p className="mt-1 text-[9px] text-slate-500">مشاهده موجودی و گردش</p>
        </Link>
        <Link
          href="/loyalty"
          className="rounded-[20px] border border-amber-100 bg-amber-50 p-4"
        >
          <Star className="text-amber-500" />
          <p className="mt-3 text-[11px] font-black text-slate-700">
            امتیاز و دستاوردها
          </p>
          <p className="mt-1 text-[9px] text-slate-500">
            {profile.loyalty?.points?.toLocaleString("fa-IR") ?? "۰"} امتیاز
          </p>
        </Link>
      </div>

      <div className="mt-4 overflow-hidden rounded-[22px] border border-[var(--bw-border)] bg-white">
        {menu.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex min-h-14 items-center gap-3 border-b border-slate-100 px-4 last:border-0"
          >
            <Icon size={18} className="text-blue-600" />
            <span className="text-[11px] font-bold text-slate-700">
              {label}
            </span>
            <ChevronLeft size={17} className="mr-auto text-slate-400" />
          </Link>
        ))}
      </div>
      <div className="mt-4 flex items-start gap-3 rounded-[18px] border border-blue-100 bg-blue-50 p-4">
        <ShieldCheck className="mt-0.5 shrink-0 text-blue-600" size={19} />
        <p className="text-[10px] leading-6 text-slate-600">
          برای مدیریت رمز عبور و خروج از دستگاه‌های دیگر، وارد بخش امنیت و رمز
          عبور شوید.
        </p>
      </div>
      <button
        onClick={() => void logout().then(() => setProfile(null))}
        className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-[15px] border border-red-100 bg-red-50 text-[11px] font-black text-red-600"
      >
        <LogOut size={17} />
        خروج از حساب
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-bold text-slate-600">
        {label}
      </span>
      <input
        type={type}
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full rounded-[14px] border border-[var(--bw-border)] px-3 text-[12px] outline-none focus:border-blue-400"
      />
    </label>
  );
}
