"use client";

import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Phone,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ApiError,
  passwordLogin,
  requestOtp,
  setPassword,
  type CustomerProfile,
  updateProfile,
  verifyOtp,
} from "../../lib/api/account";

type Intent = "login" | "register";
type Step = "form" | "code" | "optional-password" | "reset-password";

export function AuthPanel({
  onAuthenticated,
  defaultIntent = "login",
}: {
  onAuthenticated?: (profile: CustomerProfile) => void;
  defaultIntent?: Intent;
}) {
  const router = useRouter();
  const [intent, setIntent] = useState<Intent>(defaultIntent);
  const [loginMethod, setLoginMethod] = useState<"otp" | "password">("otp");
  const [step, setStep] = useState<Step>("form");
  const [forgotPassword, setForgotPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [password, setPasswordValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [developmentCode, setDevelopmentCode] = useState<string | null>(null);
  const [authenticatedProfile, setAuthenticatedProfile] =
    useState<CustomerProfile | null>(null);

  function finish(profile: CustomerProfile) {
    onAuthenticated?.(profile);
    if (!onAuthenticated) router.replace("/profile");
  }

  function switchIntent(next: Intent) {
    setIntent(next);
    setStep("form");
    setForgotPassword(false);
    setError(null);
    setCode("");
    setPasswordValue("");
  }

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      if (step === "optional-password" || step === "reset-password") {
        if (password.length < 8) {
          setError("رمز عبور باید حداقل ۸ نویسه داشته باشد.");
          return;
        }
        await setPassword(password);
        const profile = authenticatedProfile
          ? { ...authenticatedProfile, passwordConfigured: true }
          : authenticatedProfile;
        if (profile) finish(profile);
        return;
      }

      if (intent === "login" && loginMethod === "password" && !forgotPassword) {
        const result = await passwordLogin(mobile, password);
        finish(result.customer);
        return;
      }

      const purpose = forgotPassword ? "FORGOT_PASSWORD" : "REGISTER_LOGIN";
      if (step === "form") {
        if (intent === "register" && (!firstName.trim() || !lastName.trim())) {
          setError("نام و نام خانوادگی را کامل وارد کنید.");
          return;
        }
        const result = await requestOtp(mobile, purpose);
        setDevelopmentCode(result.developmentCode ?? null);
        setStep("code");
        return;
      }

      const result = await verifyOtp(mobile, code, purpose);
      let profile = result.customer;
      if (intent === "register") {
        profile = await updateProfile({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        });
      }
      setAuthenticatedProfile(profile);
      if (forgotPassword) {
        setStep("reset-password");
      } else if (intent === "register") {
        setStep("optional-password");
      } else {
        finish(profile);
      }
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "ارتباط با سرور برقرار نشد. دوباره تلاش کنید.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-[var(--bw-border)] bg-white shadow-[var(--bw-shadow-card)]">
      <div className="grid grid-cols-2 bg-[var(--bw-bg)] p-1.5">
        <button
          type="button"
          onClick={() => switchIntent("login")}
          className={`min-h-12 rounded-[14px] text-[12px] font-black transition ${intent === "login" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}
        >
          ورود
        </button>
        <button
          type="button"
          onClick={() => switchIntent("register")}
          className={`min-h-12 rounded-[14px] text-[12px] font-black transition ${intent === "register" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}
        >
          ثبت‌نام
        </button>
      </div>

      <div className="p-5">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-blue-50 text-blue-600">
            {intent === "register" ? (
              <UserRound size={21} />
            ) : (
              <KeyRound size={21} />
            )}
          </span>
          <div>
            <h2 className="text-[15px] font-black text-slate-800">
              {forgotPassword
                ? "بازیابی رمز عبور"
                : intent === "register"
                  ? "ساخت حساب BestWash"
                  : "خوش آمدید"}
            </h2>
            <p className="mt-1 text-[11px] leading-5 text-slate-500">
              {step === "code"
                ? "کد شش‌رقمی ارسال‌شده را وارد کنید."
                : step === "optional-password"
                  ? "برای ورود سریع‌تر در دفعات بعد می‌توانید رمز بسازید."
                  : "اطلاعات شما امن و فقط برای ارائه خدمات استفاده می‌شود."}
            </p>
          </div>
        </div>

        {intent === "login" && step === "form" && !forgotPassword ? (
          <div className="mb-5 flex rounded-[14px] bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setLoginMethod("otp")}
              className={`min-h-10 flex-1 rounded-[11px] text-[10px] font-bold ${loginMethod === "otp" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}
            >
              کد یک‌بارمصرف
            </button>
            <button
              type="button"
              onClick={() => setLoginMethod("password")}
              className={`min-h-10 flex-1 rounded-[11px] text-[10px] font-bold ${loginMethod === "password" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}
            >
              رمز عبور
            </button>
          </div>
        ) : null}

        {intent === "register" && step === "form" ? (
          <div className="mb-4 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-2 block text-[11px] font-bold text-slate-600">
                نام
              </span>
              <input
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                autoComplete="off"
                className="min-h-12 w-full rounded-[14px] border border-[var(--bw-border)] px-3 text-[12px] outline-none focus:border-blue-400"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-[11px] font-bold text-slate-600">
                نام خانوادگی
              </span>
              <input
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                autoComplete="off"
                className="min-h-12 w-full rounded-[14px] border border-[var(--bw-border)] px-3 text-[12px] outline-none focus:border-blue-400"
              />
            </label>
          </div>
        ) : null}

        {step === "form" || step === "code" ? (
          <label className="block">
            <span className="mb-2 block text-[11px] font-bold text-slate-600">
              شماره موبایل
            </span>
            <div className="flex items-center rounded-[15px] border border-[var(--bw-border)] px-3 focus-within:border-blue-400">
              <Phone size={17} className="text-slate-400" />
              <input
                dir="ltr"
                inputMode="tel"
                value={mobile}
                disabled={step === "code"}
                onChange={(event) => setMobile(event.target.value)}
                placeholder="09123456789"
                autoComplete="off"
                className="min-h-12 w-full bg-transparent px-3 text-left text-[13px] outline-none disabled:text-slate-500"
              />
            </div>
          </label>
        ) : null}

        {step === "code" ? (
          <div className="mt-4">
            <label className="block text-[11px] font-bold text-slate-600">
              کد تأیید
            </label>
            <div className="mt-2 flex items-center rounded-[15px] border border-[var(--bw-border)] px-3 focus-within:border-blue-400">
              <KeyRound size={17} className="text-slate-400" />
              <input
                dir="ltr"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, ""))
                }
                autoFocus
                autoComplete="off"
                className="min-h-12 w-full bg-transparent px-3 text-center text-[18px] font-black tracking-[0.4em] outline-none"
              />
            </div>
            {developmentCode ? (
              <p className="mt-2 rounded-[12px] bg-amber-50 p-3 text-[10px] text-amber-700">
                فقط در محیط توسعه — کد ورود: <b>{developmentCode}</b>
              </p>
            ) : null}
          </div>
        ) : null}

        {(intent === "login" &&
          loginMethod === "password" &&
          step === "form") ||
        step === "optional-password" ||
        step === "reset-password" ? (
          <label className="mt-4 block">
            <span className="mb-2 block text-[11px] font-bold text-slate-600">
              {step === "reset-password" ? "رمز عبور جدید" : "رمز عبور"}
            </span>
            <div className="flex items-center rounded-[15px] border border-[var(--bw-border)] px-3 focus-within:border-blue-400">
              <LockKeyhole size={17} className="text-slate-400" />
              <input
                dir="ltr"
                type="password"
                minLength={8}
                value={password}
                onChange={(event) => setPasswordValue(event.target.value)}
                autoComplete="off"
                placeholder="حداقل ۸ نویسه"
                className="min-h-12 w-full bg-transparent px-3 text-left text-[13px] outline-none"
              />
            </div>
          </label>
        ) : null}

        {step === "optional-password" ? (
          <div className="mt-3 flex items-start gap-2 rounded-[14px] border border-blue-100 bg-blue-50 p-3 text-[10px] leading-5 text-blue-800">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
            ساخت رمز اختیاری است؛ همیشه می‌توانید با کد یک‌بارمصرف وارد شوید.
          </div>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-[13px] bg-red-50 p-3 text-[11px] text-red-600"
          >
            {error}
          </p>
        ) : null}

        <button
          type="button"
          disabled={
            loading ||
            (!mobile &&
              step !== "optional-password" &&
              step !== "reset-password")
          }
          onClick={() => void submit()}
          className="mt-5 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[16px] bg-[var(--bw-primary-600)] text-[12px] font-black text-white shadow-[var(--bw-shadow-blue)] disabled:opacity-50"
        >
          {loading ? (
            <LoaderCircle size={18} className="animate-spin" />
          ) : (
            <ArrowLeft size={18} />
          )}
          {step === "code"
            ? "تأیید کد"
            : step === "optional-password"
              ? "ساخت رمز و ورود"
              : step === "reset-password"
                ? "ذخیره رمز جدید"
                : intent === "login" &&
                    loginMethod === "password" &&
                    !forgotPassword
                  ? "ورود به حساب"
                  : "دریافت کد تأیید"}
        </button>

        {step === "optional-password" && authenticatedProfile ? (
          <button
            type="button"
            onClick={() => finish(authenticatedProfile)}
            className="mt-3 min-h-11 w-full text-[11px] font-bold text-slate-500"
          >
            فعلاً رمز نمی‌سازم
          </button>
        ) : null}

        {intent === "login" && loginMethod === "password" && step === "form" ? (
          <button
            type="button"
            onClick={() => {
              setForgotPassword(true);
              setLoginMethod("otp");
              setError(null);
            }}
            className="mt-3 min-h-10 w-full text-[11px] font-bold text-blue-700"
          >
            رمز عبور را فراموش کرده‌ام
          </button>
        ) : null}
      </div>
    </div>
  );
}
