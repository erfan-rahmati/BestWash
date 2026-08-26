"use client";

import { BellRing, LoaderCircle, Save, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import {
  getMe,
  subscribePush,
  updateProfile,
  type CustomerProfile,
} from "../../lib/api/account";
import { GuestGate } from "./guest-gate";
import { showToast } from "../../lib/toast";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(window.atob(base64), (character) =>
    character.charCodeAt(0),
  );
}

export function SettingsPanel() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [preferences, setPreferences] = useState({
    booking: true,
    payment: true,
    loyalty: true,
    marketing: false,
  });
  useEffect(() => {
    getMe()
      .then((value) => {
        setProfile(value);
        setPreferences({
          booking: value.notificationPreferences?.booking ?? true,
          payment: value.notificationPreferences?.payment ?? true,
          loyalty: value.notificationPreferences?.loyalty ?? true,
          marketing: value.marketingConsent,
        });
      })
      .catch(() => null)
      .finally(() => setLoaded(true));
  }, []);
  async function save() {
    setSaving(true);
    try {
      const value = await updateProfile({
        marketingConsent: preferences.marketing,
        notificationPreferences: {
          booking: preferences.booking,
          payment: preferences.payment,
          loyalty: preferences.loyalty,
        },
      });
      setProfile(value);
      setMessage("تنظیمات اعلان‌ها ذخیره شد.");
      showToast("تنظیمات اعلان‌ها ذخیره شد.", "success");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "ذخیره تنظیمات انجام نشد.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function enablePush() {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window))
        throw new Error("مرورگر شما از اعلان Push پشتیبانی نمی‌کند.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted")
        throw new Error("اجازه نمایش اعلان صادر نشد.");
      const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;
      if (!publicKey)
        throw new Error("کلید عمومی Push در تنظیمات پروژه قرار نگرفته است.");
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      await subscribePush(subscription.toJSON());
      setMessage("اعلان Push روی این دستگاه فعال شد.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "فعال‌سازی Push انجام نشد.",
      );
    }
  }
  if (!loaded)
    return (
      <div className="flex min-h-52 items-center justify-center">
        <LoaderCircle className="animate-spin text-blue-600" />
      </div>
    );
  if (!profile) return <GuestGate />;
  return (
    <div>
      <div className="rounded-[24px] border border-[var(--bw-border)] bg-white p-5">
        <div className="flex items-center gap-3">
          <BellRing className="text-blue-600" />
          <div>
            <h2 className="text-[13px] font-black">ترجیحات اطلاع‌رسانی</h2>
            <p className="mt-1 text-[10px] text-slate-500">
              پیام‌های ضروری رزرو همیشه فعال می‌مانند.
            </p>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          <Toggle
            label="وضعیت رزرو و یادآوری مراجعه"
            checked={preferences.booking}
            onChange={(value) =>
              setPreferences({ ...preferences, booking: value })
            }
          />
          <Toggle
            label="پرداخت، بازپرداخت و کیف پول"
            checked={preferences.payment}
            onChange={(value) =>
              setPreferences({ ...preferences, payment: value })
            }
          />
          <Toggle
            label="امتیاز و دستاوردها"
            checked={preferences.loyalty}
            onChange={(value) =>
              setPreferences({ ...preferences, loyalty: value })
            }
          />
          <Toggle
            label="پیشنهادها و کدهای تخفیف"
            checked={preferences.marketing}
            onChange={(value) =>
              setPreferences({ ...preferences, marketing: value })
            }
          />
        </div>
        <button
          disabled={saving}
          onClick={() => void save()}
          className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-blue-600 text-[11px] font-black text-white"
        >
          <Save size={17} />
          ذخیره ترجیحات
        </button>
      </div>
      <div className="mt-4 rounded-[22px] border border-blue-100 bg-blue-50 p-5">
        <div className="flex items-center gap-3">
          <Smartphone className="text-blue-600" />
          <div>
            <h2 className="text-[12px] font-black">اعلان روی این دستگاه</h2>
            <p className="mt-1 text-[10px] leading-5 text-slate-500">
              حتی وقتی برنامه باز نیست، رویداد مهم رزرو را دریافت کنید.
            </p>
          </div>
        </div>
        <button
          onClick={() => void enablePush()}
          className="mt-4 min-h-11 w-full rounded-[14px] bg-white text-[10px] font-black text-blue-700"
        >
          فعال‌سازی اعلان Push
        </button>
      </div>
      {message ? (
        <p
          role="status"
          className="mt-4 rounded-[14px] bg-slate-100 p-3 text-[10px] leading-5 text-slate-700"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex min-h-14 items-center rounded-[16px] bg-slate-50 px-4">
      <span className="text-[11px] font-bold text-slate-700">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span className="relative mr-auto h-7 w-12 rounded-full bg-slate-300 transition peer-checked:bg-blue-600 after:absolute after:right-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-[-20px]" />
    </label>
  );
}
