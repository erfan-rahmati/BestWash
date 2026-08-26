"use client";

import {
  Bell,
  ChevronLeft,
  ExternalLink,
  KeyRound,
  LogIn,
  LogOut,
  Menu,
  MoreHorizontal,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { showToast } from "../../lib/toast";
import {
  AdminSection,
  JsonRecord,
  adminRequest,
  arr,
  dateTime,
  navigation,
} from "./admin-core";

export function AdminLogin({
  onSuccess,
}: {
  onSuccess: () => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await adminRequest<{
        admin?: JsonRecord;
        requiresTwoFactor?: boolean;
        challengeId?: string;
        developmentCode?: string;
      }>("/admin/auth/login", "", {
        method: "POST",
        body: JSON.stringify({
          username,
          password,
          challengeId: challengeId || undefined,
          otpCode: otpCode || undefined,
        }),
      });
      if (result.admin) return onSuccess();
      if (result.requiresTwoFactor && result.challengeId) {
        setChallengeId(result.challengeId);
        setNotice(
          result.developmentCode
            ? `کد محیط توسعه: ${result.developmentCode}`
            : "کد شش‌رقمی به شماره امن مدیر پیامک شد.",
        );
        return;
      }
      throw new Error("پاسخ ورود معتبر نیست.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ورود انجام نشد.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      dir="rtl"
      className="relative grid min-h-dvh overflow-hidden bg-[#070a15] text-slate-900 lg:grid-cols-[1.05fr_.95fr]"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_12%,rgba(124,58,237,.24),transparent_30%),radial-gradient(circle_at_20%_82%,rgba(6,182,212,.16),transparent_28%)]" />
      <section className="relative hidden items-end p-12 text-white lg:flex xl:p-20">
        <div className="max-w-2xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-violet-100 backdrop-blur">
            <Sparkles size={15} /> مرکز فرمان عملیات BestWash
          </div>
          <h1 className="text-5xl font-black leading-[1.35] tracking-tight">
            مدیریت دقیق،
            <br />
            <span className="bg-gradient-to-l from-violet-300 to-cyan-300 bg-clip-text text-transparent">
              تجربه درخشان مشتری
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-sm leading-8 text-slate-300">
            رزرو، پرداخت، خدمات، تحویل و ارتباط با مشتری در یک فضای امن و
            یکپارچه مدیریت می‌شود.
          </p>
          <div className="mt-10 grid max-w-lg grid-cols-3 gap-3 text-center text-[11px] text-slate-300">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <ShieldCheck className="mx-auto mb-2 text-emerald-300" />
              نشست امن
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <KeyRound className="mx-auto mb-2 text-violet-300" />
              تأیید دومرحله‌ای
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <Bell className="mx-auto mb-2 text-cyan-300" />
              اعلان لحظه‌ای
            </div>
          </div>
        </div>
      </section>
      <section className="relative grid place-items-center p-5 sm:p-10">
        <form
          onSubmit={submit}
          className="w-full max-w-md rounded-[32px] border border-white/10 bg-white p-7 shadow-[0_50px_120px_rgba(0,0,0,.48)] sm:p-9"
        >
          <div className="mb-8 flex items-center gap-3">
            <div className="grid size-13 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-lg shadow-violet-600/25">
              <ShieldCheck />
            </div>
            <div>
              <h2 className="text-xl font-black">ورود به پنل مدیریت</h2>
              <p className="mt-1 text-xs text-slate-500">
                دسترسی امن مدیر BestWash
              </p>
            </div>
          </div>
          {error ? (
            <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold leading-6 text-rose-700">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p className="mb-4 rounded-2xl border border-violet-200 bg-violet-50 p-3 text-xs font-bold leading-6 text-violet-700">
              {notice}
            </p>
          ) : null}
          {!challengeId ? (
            <div className="space-y-4">
              <label className="grid gap-2 text-xs font-black">
                نام کاربری
                <input
                  dir="ltr"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                  className="min-h-13 rounded-2xl border border-slate-200 px-4 text-left text-sm font-normal outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                  placeholder="bestwash_owner"
                />
              </label>
              <label className="grid gap-2 text-xs font-black">
                رمز عبور
                <input
                  dir="ltr"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="min-h-13 rounded-2xl border border-slate-200 px-4 text-left text-sm font-normal outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                />
              </label>
            </div>
          ) : (
            <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4">
              <p className="text-sm font-black text-violet-900">
                تأیید هویت دومرحله‌ای
              </p>
              <p className="mt-2 text-xs leading-6 text-slate-600">
                کد پیامک‌شده به شماره امن و غیرقابل‌ویرایش مدیر را وارد کنید.
              </p>
              <input
                dir="ltr"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={otpCode}
                onChange={(event) =>
                  setOtpCode(event.target.value.replace(/\D/g, ""))
                }
                required
                className="mt-4 min-h-14 w-full rounded-2xl border border-violet-200 bg-white px-4 text-center text-2xl font-black tracking-[.45em] outline-none focus:border-violet-500"
                placeholder="••••••"
              />
            </div>
          )}
          <button
            disabled={busy}
            className="mt-5 flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-violet-600 to-indigo-700 text-sm font-black text-white shadow-lg shadow-violet-600/20 disabled:opacity-50"
          >
            <LogIn size={18} />
            {busy
              ? "در حال بررسی..."
              : challengeId
                ? "تأیید و ورود امن"
                : "ادامه ورود"}
          </button>
          {challengeId ? (
            <button
              type="button"
              onClick={() => {
                setChallengeId("");
                setOtpCode("");
                setNotice("");
              }}
              className="mt-3 w-full py-2 text-xs font-bold text-slate-500"
            >
              بازگشت و اصلاح اطلاعات
            </button>
          ) : null}
          <p className="mt-6 text-center text-[10px] leading-5 text-slate-400">
            شماره امن مدیر فقط از پیکربندی محافظت‌شده سرور قابل تغییر است.
          </p>
        </form>
      </section>
    </main>
  );
}

type ShellProps = {
  section: AdminSection;
  route: string;
  token: string;
  loading: boolean;
  onNavigate: (path: string) => void;
  onRefresh: () => void;
  onLogout: () => void;
  children: React.ReactNode;
};

export function AdminShell({
  section,
  route,
  token,
  loading,
  onNavigate,
  onRefresh,
  onLogout,
  children,
}: ShellProps) {
  const [sidebar, setSidebar] = useState(false);
  const [more, setMore] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profile, setProfile] = useState<JsonRecord>({});
  const [notifications, setNotifications] = useState<JsonRecord>({
    items: [],
    unreadCount: 0,
  });
  const current =
    navigation.find((item) => item.id === section) ?? navigation[0];

  const loadChrome = useCallback(async () => {
    const [profileResult, notificationResult] = await Promise.all([
      adminRequest<JsonRecord>("/admin/profile", token),
      adminRequest<JsonRecord>("/admin/notifications", token),
    ]);
    setProfile(profileResult);
    setNotifications(notificationResult);
  }, [token]);

  useEffect(() => {
    const initial = window.setTimeout(
      () => void loadChrome().catch(() => undefined),
      0,
    );
    const interval = window.setInterval(
      () => void loadChrome().catch(() => undefined),
      20_000,
    );
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [loadChrome]);

  const unread = Number(notifications.unreadCount ?? 0);
  const initials = String(profile.displayName ?? "مدیر BestWash").slice(0, 1);
  const primaryNav = useMemo(
    () =>
      navigation.filter((item) =>
        ["dashboard", "bookings", "customers", "payments"].includes(item.id),
      ),
    [],
  );

  async function readNotification(item: JsonRecord) {
    if (!item.readAt) {
      await adminRequest(
        `/admin/notifications/${String(item.id)}/read`,
        token,
        { method: "PATCH", body: "{}" },
      );
    }
    if (item.actionUrl)
      onNavigate(String(item.actionUrl).replace(/^\/admin\/?/, ""));
    setNotificationsOpen(false);
    void loadChrome();
  }

  async function enablePush() {
    try {
      if (
        !("Notification" in window) ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window)
      )
        throw new Error("این مرورگر از اعلان لحظه‌ای پشتیبانی نمی‌کند.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted")
        throw new Error("اجازه نمایش اعلان صادر نشد.");
      const key = String(notifications.pushPublicKey ?? "");
      if (!key)
        throw new Error("کلید اعلان لحظه‌ای در تنظیمات سرور قرار نگرفته است.");
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
      });
      const json = subscription.toJSON();
      await adminRequest("/admin/push-subscriptions", token, {
        method: "POST",
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        }),
      });
      showToast("اعلان‌های لحظه‌ای پنل فعال شد.", "success");
    } catch (cause) {
      showToast(
        cause instanceof Error ? cause.message : "فعال‌سازی اعلان انجام نشد.",
        "error",
      );
    }
  }

  function navigate(path: string) {
    onNavigate(path);
    setSidebar(false);
    setMore(false);
  }

  return (
    <div
      dir="rtl"
      className="min-h-dvh bg-[#f5f6fa] text-slate-900 [--admin-violet:#6d3ff2]"
    >
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-[288px] flex-col overflow-hidden border-l border-white/10 bg-[#0b0d1a] text-white shadow-2xl transition-transform lg:translate-x-0 ${sidebar ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="pointer-events-none absolute -right-20 top-0 size-64 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="relative flex h-24 items-center gap-3 border-b border-white/8 px-5">
          <div className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-700 shadow-lg shadow-violet-950">
            <ShieldCheck />
          </div>
          <div>
            <b className="text-xl tracking-tight">BestWash</b>
            <p className="mt-1 text-[10px] text-slate-400">مرکز فرمان مدیریت</p>
          </div>
          <button
            aria-label="بستن منو"
            onClick={() => setSidebar(false)}
            className="mr-auto rounded-xl p-2 text-slate-400 hover:bg-white/10 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="relative flex-1 space-y-1 overflow-y-auto p-4 bw-scrollbar-hidden">
          {navigation.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.id === "dashboard" ? "" : item.id)}
              className={`group flex min-h-12 w-full items-center gap-3 rounded-2xl px-3.5 text-right text-xs transition ${section === item.id ? "bg-gradient-to-l from-violet-600 to-indigo-700 font-black text-white shadow-lg shadow-violet-950/50" : "text-slate-400 hover:bg-white/7 hover:text-white"}`}
            >
              <item.icon
                size={18}
                className={
                  section === item.id
                    ? "text-white"
                    : "text-slate-500 group-hover:text-violet-300"
                }
              />
              <span>{item.label}</span>
              <ChevronLeft size={14} className="mr-auto opacity-35" />
            </button>
          ))}
        </nav>
        <div className="relative border-t border-white/8 p-4">
          <button
            onClick={() => setProfileOpen(true)}
            className="mb-2 flex w-full items-center gap-3 rounded-2xl bg-white/5 p-3 text-right hover:bg-white/9"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-violet-500 text-sm font-black">
              {initials}
            </span>
            <span className="min-w-0">
              <b className="block truncate text-xs">
                {String(profile.displayName ?? "مدیر BestWash")}
              </b>
              <small className="mt-1 block truncate text-[9px] text-slate-500">
                {String(profile.username ?? "حساب مدیریت")}
              </small>
            </span>
            <ChevronLeft className="mr-auto text-slate-600" size={15} />
          </button>
          <button
            onClick={onLogout}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-white/8 text-xs font-bold text-rose-300 hover:bg-rose-500/10"
          >
            <LogOut size={16} />
            خروج امن
          </button>
        </div>
      </aside>
      {sidebar ? (
        <button
          aria-label="بستن منو"
          onClick={() => setSidebar(false)}
          className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-sm lg:hidden"
        />
      ) : null}

      <main className="min-h-dvh pb-24 lg:mr-[288px] lg:pb-0">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 px-4 backdrop-blur-2xl sm:px-6 lg:px-8">
          <div className="mx-auto flex h-20 max-w-[1600px] items-center gap-3">
            <button
              aria-label="باز کردن منو"
              onClick={() => setSidebar(true)}
              className="grid size-11 place-items-center rounded-2xl border border-slate-200 bg-white lg:hidden"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-black tracking-tight sm:text-xl">
                {current.label}
              </h1>
              <p className="mt-1 hidden truncate text-[10px] text-slate-500 sm:block">
                {route.includes("/new")
                  ? "ایجاد مورد جدید"
                  : route.includes("/edit")
                    ? "ویرایش مورد انتخاب‌شده"
                    : current.description}
              </p>
            </div>
            <div className="mr-auto flex items-center gap-2">
              <button
                onClick={onRefresh}
                disabled={loading}
                title="بروزرسانی"
                className="grid size-11 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-500 hover:border-violet-200 hover:text-violet-600"
              >
                <RefreshCw
                  size={18}
                  className={loading ? "animate-spin" : ""}
                />
              </button>
              <div className="relative">
                <button
                  onClick={() => {
                    setNotificationsOpen((value) => !value);
                    setProfileOpen(false);
                  }}
                  title="اعلان‌ها"
                  className="relative grid size-11 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-600"
                >
                  <Bell size={19} />
                  {unread ? (
                    <span className="absolute -left-1 -top-1 grid min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white ring-2 ring-white">
                      {unread.toLocaleString("fa-IR")}
                    </span>
                  ) : null}
                </button>
                {notificationsOpen ? (
                  <NotificationPopover
                    data={notifications}
                    onRead={readNotification}
                    onEnablePush={() => void enablePush()}
                    onClose={() => setNotificationsOpen(false)}
                  />
                ) : null}
              </div>
              <button
                onClick={() => {
                  setProfileOpen(true);
                  setNotificationsOpen(false);
                }}
                className="hidden min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2.5 pl-4 sm:flex"
              >
                <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-700 text-xs font-black text-white">
                  {initials}
                </span>
                <span className="max-w-28 truncate text-[11px] font-black">
                  {String(profile.displayName ?? "پروفایل مدیر")}
                </span>
              </button>
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>

      <nav
        aria-label="دسترسی سریع مدیریت"
        className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-[22px] border border-slate-200/80 bg-white/95 p-2 shadow-[0_24px_70px_rgba(15,23,42,.24)] backdrop-blur-xl lg:hidden"
      >
        {primaryNav.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.id === "dashboard" ? "" : item.id)}
            className={`flex min-h-13 flex-col items-center justify-center gap-1 rounded-2xl text-[9px] font-black ${section === item.id ? "bg-violet-50 text-violet-700" : "text-slate-400"}`}
          >
            <item.icon size={19} />
            {item.shortLabel}
          </button>
        ))}
        <button
          onClick={() => setMore(true)}
          className="flex min-h-13 flex-col items-center justify-center gap-1 rounded-2xl text-[9px] font-black text-slate-400"
        >
          <MoreHorizontal size={20} />
          بیشتر
        </button>
      </nav>
      {more ? (
        <MobileMoreModal
          section={section}
          onNavigate={navigate}
          onClose={() => setMore(false)}
        />
      ) : null}
      {profileOpen ? (
        <ProfileModal
          profile={profile}
          onClose={() => setProfileOpen(false)}
          onLogout={onLogout}
        />
      ) : null}
    </div>
  );
}

function NotificationPopover({
  data,
  onRead,
  onEnablePush,
  onClose,
}: {
  data: JsonRecord;
  onRead: (item: JsonRecord) => void;
  onEnablePush: () => void;
  onClose: () => void;
}) {
  const items = arr(data.items);
  return (
    <div className="fixed inset-x-4 top-20 z-50 max-h-[70dvh] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_30px_100px_rgba(15,23,42,.24)] sm:absolute sm:left-0 sm:right-auto sm:top-14 sm:w-[380px]">
      <div className="flex items-center border-b border-slate-100 p-4">
        <div>
          <b className="text-sm">اعلان‌های مدیریت</b>
          <p className="mt-1 text-[10px] text-slate-400">
            رویدادهای رزرو، پرداخت و پشتیبانی
          </p>
        </div>
        <button
          onClick={onClose}
          className="mr-auto rounded-xl p-2 hover:bg-slate-100"
        >
          <X size={18} />
        </button>
      </div>
      <div className="max-h-[52dvh] divide-y divide-slate-100 overflow-y-auto">
        {items.map((item) => (
          <button
            key={String(item.id)}
            onClick={() => onRead(item)}
            className={`block w-full p-4 text-right hover:bg-slate-50 ${item.readAt ? "opacity-60" : "bg-violet-50/35"}`}
          >
            <div className="flex gap-3">
              <span
                className={`mt-1 size-2 rounded-full ${item.readAt ? "bg-slate-300" : "bg-violet-500"}`}
              />
              <span className="min-w-0">
                <b className="block text-xs">{String(item.title)}</b>
                <span className="mt-1 block text-[10px] leading-5 text-slate-500">
                  {String(item.body)}
                </span>
                <small className="mt-2 block text-[9px] text-slate-400">
                  {dateTime(item.createdAt)}
                </small>
              </span>
            </div>
          </button>
        ))}
        {!items.length ? (
          <p className="p-8 text-center text-xs text-slate-400">
            اعلان جدیدی ندارید.
          </p>
        ) : null}
      </div>
      <button
        onClick={onEnablePush}
        className="flex min-h-12 w-full items-center justify-center gap-2 border-t border-slate-100 text-xs font-black text-violet-700"
      >
        <Bell size={16} />
        فعال‌سازی اعلان لحظه‌ای
      </button>
    </div>
  );
}

function MobileMoreModal({
  section,
  onNavigate,
  onClose,
}: {
  section: AdminSection;
  onNavigate: (path: string) => void;
  onClose: () => void;
}) {
  const rest = navigation.filter(
    (item) =>
      !["dashboard", "bookings", "customers", "payments"].includes(item.id),
  );
  return (
    <div
      className="fixed inset-0 z-[70] flex items-end bg-slate-950/55 p-3 backdrop-blur-sm lg:hidden"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section className="w-full rounded-[28px] bg-white p-4 shadow-2xl">
        <div className="mb-3 flex items-center px-1">
          <div>
            <h2 className="text-base font-black">بخش‌های بیشتر</h2>
            <p className="mt-1 text-[10px] text-slate-400">
              دسترسی کامل مدیریت
            </p>
          </div>
          <button
            onClick={onClose}
            className="mr-auto grid size-10 place-items-center rounded-2xl bg-slate-100"
          >
            <X size={19} />
          </button>
        </div>
        <div className="grid max-h-[62dvh] grid-cols-3 gap-2 overflow-y-auto">
          {rest.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border p-2 text-[10px] font-black ${section === item.id ? "border-violet-200 bg-violet-50 text-violet-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}
            >
              <item.icon size={22} />
              {item.shortLabel}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function ProfileModal({
  profile,
  onClose,
  onLogout,
}: {
  profile: JsonRecord;
  onClose: () => void;
  onLogout: () => void;
}) {
  const roles = arr(profile.roles);
  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section className="w-full max-w-lg overflow-hidden rounded-[30px] bg-white shadow-2xl">
        <div className="relative bg-[#0b0d1a] p-6 text-white">
          <div className="absolute -left-10 -top-14 size-40 rounded-full bg-violet-600/30 blur-3xl" />
          <button
            onClick={onClose}
            className="absolute left-4 top-4 rounded-xl p-2 text-slate-400 hover:bg-white/10"
          >
            <X size={19} />
          </button>
          <div className="relative flex items-center gap-4">
            <div className="grid size-16 place-items-center rounded-[22px] bg-gradient-to-br from-violet-500 to-indigo-700 text-2xl font-black">
              {String(profile.displayName ?? "م").slice(0, 1)}
            </div>
            <div>
              <h2 className="text-xl font-black">
                {String(profile.displayName ?? "مدیر BestWash")}
              </h2>
              <p dir="ltr" className="mt-1 text-left text-xs text-violet-200">
                @{String(profile.username ?? "admin")}
              </p>
            </div>
          </div>
        </div>
        <div className="grid gap-3 p-6 sm:grid-cols-2">
          <Info
            label="ایمیل مدیر"
            value={String(profile.email ?? "ثبت نشده")}
          />
          <Info
            label="شماره امن"
            value={String(profile.mobile ?? "محافظت‌شده")}
          />
          <Info label="آخرین ورود" value={dateTime(profile.lastLoginAt)} />
          <Info
            label="سطح دسترسی"
            value={
              roles.map((item) => String(item.nameFa)).join("، ") || "مدیر"
            }
          />
        </div>
        <div className="mx-6 mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[10px] leading-6 text-amber-800">
          برای حفظ امنیت، شماره دریافت کد دومرحله‌ای در این صفحه قابل تغییر نیست
          و فقط از پیکربندی محافظت‌شده سرور مدیریت می‌شود.
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-4">
          <a
            href="/"
            target="_blank"
            className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 text-xs font-black text-slate-600"
          >
            <ExternalLink size={15} />
            مشاهده برنامه
          </a>
          <button
            onClick={onLogout}
            className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-rose-50 text-xs font-black text-rose-700"
          >
            <LogOut size={15} />
            خروج امن
          </button>
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-[10px] text-slate-400">{label}</p>
      <b className="mt-2 block break-all text-xs text-slate-700">{value}</b>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from(
    [...rawData].map((character) => character.charCodeAt(0)),
  );
}
