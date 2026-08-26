"use client";

import { LoaderCircle, LockKeyhole, LogOut, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, getMe, logoutAll, setPassword } from "../../lib/api/account";
import { GuestGate } from "./guest-gate";
import { showToast } from "../../lib/toast";

export function SecurityPanel() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [password, setPasswordValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    getMe()
      .catch((error) =>
        setUnauthorized(error instanceof ApiError && error.status === 401),
      )
      .finally(() => setReady(true));
  }, []);
  async function save() {
    if (password.length < 8) {
      showToast("رمز عبور باید حداقل ۸ نویسه داشته باشد.", "error");
      return setMessage("رمز عبور باید حداقل ۸ نویسه داشته باشد.");
    }
    if (password !== confirm) {
      showToast("تکرار رمز عبور یکسان نیست.", "error");
      return setMessage("تکرار رمز عبور یکسان نیست.");
    }
    setSaving(true);
    try {
      await setPassword(password);
      setPasswordValue("");
      setConfirm("");
      setMessage("رمز عبور با موفقیت ذخیره شد.");
      showToast("رمز عبور با موفقیت ذخیره شد.", "success");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "ذخیره رمز انجام نشد.",
      );
    } finally {
      setSaving(false);
    }
  }
  if (!ready)
    return (
      <div className="flex min-h-52 items-center justify-center">
        <LoaderCircle className="animate-spin text-blue-600" />
      </div>
    );
  if (unauthorized) return <GuestGate />;
  return (
    <div>
      <div className="rounded-[24px] border border-[var(--bw-border)] bg-white p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-blue-50 text-blue-600">
            <LockKeyhole size={20} />
          </span>
          <div>
            <h2 className="text-[13px] font-black">تنظیم رمز عبور</h2>
            <p className="mt-1 text-[10px] text-slate-500">
              حداقل ۸ نویسه؛ ترجیحاً ترکیبی از عدد و حروف
            </p>
          </div>
        </div>
        <label className="mt-5 block text-[11px] font-bold text-slate-600">
          رمز عبور جدید
          <input
            dir="ltr"
            type="password"
            value={password}
            onChange={(event) => setPasswordValue(event.target.value)}
            className="mt-2 min-h-12 w-full rounded-[14px] border border-[var(--bw-border)] px-3 text-left text-[12px] outline-none focus:border-blue-400"
          />
        </label>
        <label className="mt-4 block text-[11px] font-bold text-slate-600">
          تکرار رمز عبور
          <input
            dir="ltr"
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            className="mt-2 min-h-12 w-full rounded-[14px] border border-[var(--bw-border)] px-3 text-left text-[12px] outline-none focus:border-blue-400"
          />
        </label>
        {message ? (
          <p className="mt-3 rounded-[12px] bg-blue-50 p-3 text-[10px] text-blue-700">
            {message}
          </p>
        ) : null}
        <button
          disabled={saving}
          onClick={() => void save()}
          className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-blue-600 text-[11px] font-black text-white disabled:opacity-50"
        >
          {saving ? (
            <LoaderCircle size={17} className="animate-spin" />
          ) : (
            <ShieldCheck size={17} />
          )}
          ذخیره رمز
        </button>
      </div>
      <div className="mt-4 rounded-[22px] border border-red-100 bg-red-50 p-5">
        <h2 className="text-[12px] font-black text-red-700">
          خروج از همه دستگاه‌ها
        </h2>
        <p className="mt-2 text-[10px] leading-6 text-red-600">
          همه نشست‌های فعال حساب، از جمله همین دستگاه، بسته می‌شوند.
        </p>
        <button
          onClick={() => void logoutAll().then(() => router.replace("/auth"))}
          className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-white text-[10px] font-black text-red-600"
        >
          <LogOut size={16} />
          خروج از همه دستگاه‌ها
        </button>
      </div>
    </div>
  );
}
