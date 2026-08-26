"use client";

import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  LoaderCircle,
  ShieldCheck,
  TimerReset,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AuthPanel } from "../auth/auth-panel";
import {
  getMe,
  getPaymentQuote,
  initiatePayment,
  type CustomerProfile,
} from "../../lib/api/account";
import { showToast } from "../../lib/toast";
import {
  BookingCheckoutApiError,
  cancelBookingCheckout,
  createBookingCheckout,
  getBookingCheckout,
  type BookingCheckoutData,
} from "../../lib/api/booking-checkouts";
import {
  BookingHoldApiError,
  cancelBookingHold,
  getBookingHold,
  type BookingHoldData,
} from "../../lib/api/booking-holds";
import type { BookingVehicleSelection } from "../../lib/booking-types";
import { toPersianDigits } from "../../lib/iran-plate";

interface CheckoutStepProps {
  vehicle: BookingVehicleSelection;
  hold: BookingHoldData;

  existingCheckoutToken: string | null;

  onCheckoutReady: (checkout: BookingCheckoutData) => void;

  onCancelled: () => void;

  onExpired: () => void;
}

type CheckoutPhase = "loading" | "active" | "error";

function formatToman(amountRial: number): string {
  return `${new Intl.NumberFormat("fa-IR").format(
    Math.round(amountRial / 10),
  )} تومان`;
}

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);

  const seconds = totalSeconds % 60;

  return toPersianDigits(
    `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
  );
}

export function CheckoutStep({
  vehicle,
  hold,
  existingCheckoutToken,
  onCheckoutReady,
  onCancelled,
  onExpired,
}: CheckoutStepProps) {
  const [checkout, setCheckout] = useState<BookingCheckoutData | null>(null);

  const [phase, setPhase] = useState<CheckoutPhase>("loading");

  const [error, setError] = useState<string | null>(null);

  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const [cancelling, setCancelling] = useState(false);

  const [requestRevision, setRequestRevision] = useState(0);

  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [useWallet, setUseWallet] = useState(false);
  const [pickupMode, setPickupMode] = useState<"OWNER" | "DELEGATE">("OWNER");
  const [delegateName, setDelegateName] = useState("");
  const [delegateMobile, setDelegateMobile] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [paying, setPaying] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [quote, setQuote] = useState<{
    discountAmountRial: number;
    gatewayAmountRial: number;
    walletAmountRial: number;
  } | null>(null);

  const expirationHandledRef = useRef(false);

  useEffect(() => {
    getMe()
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setCheckingAuth(false));
  }, []);

  async function handlePayment() {
    if (!checkout || !profile || paying) return;
    if (
      pickupMode === "DELEGATE" &&
      (!delegateName.trim() || !delegateMobile.trim())
    ) {
      setError("نام و شماره موبایل تحویل‌گیرنده را کامل وارد کنید.");
      return;
    }
    setPaying(true);
    setError(null);
    try {
      const payment = await initiatePayment(checkout.token, {
        useWallet,
        pickupMode,
        delegateName: pickupMode === "DELEGATE" ? delegateName : undefined,
        delegateMobile: pickupMode === "DELEGATE" ? delegateMobile : undefined,
        couponCode: couponCode.trim() || undefined,
      });
      if (payment.redirectUrl) {
        window.location.assign(payment.redirectUrl);
        return;
      }
      window.location.assign(
        payment.bookingId ? `/bookings/${payment.bookingId}` : "/bookings",
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "شروع پرداخت انجام نشد.",
      );
      setPaying(false);
    }
  }

  async function applyCoupon() {
    if (!checkout || !couponCode.trim() || quoting) return;
    setQuoting(true);
    setError(null);
    try {
      const result = await getPaymentQuote(checkout.token, {
        useWallet,
        couponCode: couponCode.trim(),
      });
      setQuote(result);
      showToast(
        `کد تخفیف اعمال شد؛ ${formatToman(result.discountAmountRial)} تخفیف.`,
        "success",
      );
    } catch (requestError) {
      setQuote(null);
      const message =
        requestError instanceof Error
          ? requestError.message
          : "بررسی کد تخفیف ناموفق بود.";
      setError(message);
      showToast(message, "error");
    } finally {
      setQuoting(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    async function prepareCheckout() {
      try {
        const preparedCheckout = existingCheckoutToken
          ? await getBookingCheckout(existingCheckoutToken, controller.signal)
          : await createBookingCheckout(hold.token, vehicle, controller.signal);

        if (controller.signal.aborted) {
          return;
        }

        if (preparedCheckout.status === "CANCELLED") {
          onCancelled();
          return;
        }

        if (preparedCheckout.status === "EXPIRED") {
          onExpired();
          return;
        }

        if (preparedCheckout.status !== "PENDING") {
          setPhase("error");

          setError(
            "وضعیت این مرحله قابل ادامه نیست. لطفاً وضعیت رزرو را دوباره بررسی کنید.",
          );

          return;
        }

        if (
          preparedCheckout.hold &&
          preparedCheckout.hold.token !== hold.token
        ) {
          setPhase("error");

          setError("اطلاعات Checkout با رزرو موقت فعلی مطابقت ندارد.");

          return;
        }

        setCheckout(preparedCheckout);
        setError(null);
        setPhase("active");

        onCheckoutReady(preparedCheckout);
      } catch (requestError: unknown) {
        if (controller.signal.aborted) {
          return;
        }

        if (
          requestError instanceof BookingCheckoutApiError &&
          requestError.status === 404 &&
          !existingCheckoutToken
        ) {
          onExpired();
          return;
        }

        if (
          requestError instanceof BookingCheckoutApiError &&
          requestError.status === 409
        ) {
          try {
            const freshHold = await getBookingHold(
              hold.token,
              controller.signal,
            );

            if (controller.signal.aborted) {
              return;
            }

            if (freshHold.status === "CANCELLED") {
              onCancelled();
              return;
            }

            if (freshHold.status === "EXPIRED") {
              onExpired();
              return;
            }
          } catch (holdError: unknown) {
            if (controller.signal.aborted) {
              return;
            }

            if (
              holdError instanceof BookingHoldApiError &&
              holdError.status === 404
            ) {
              onExpired();
              return;
            }
          }
        }

        setPhase("error");

        if (requestError instanceof BookingCheckoutApiError) {
          setError(
            `خطای سرور (${requestError.status}): ${requestError.message}`,
          );

          return;
        }

        setError(
          "ارتباط با سرور برقرار نشد. اتصال اینترنت و اجرای API را بررسی کنید.",
        );
      }
    }

    void prepareCheckout();

    return () => {
      controller.abort();
    };
  }, [
    existingCheckoutToken,
    hold.token,
    onCancelled,
    onCheckoutReady,
    onExpired,
    requestRevision,
    vehicle,
  ]);

  useEffect(() => {
    if (!checkout || phase !== "active") {
      return;
    }

    const activeCheckout = checkout;

    expirationHandledRef.current = false;
    let expirationTimeoutId: number | null = null;

    function updateCountdown() {
      const expiresAt = Date.parse(activeCheckout.expiresAt);

      const seconds = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));

      setRemainingSeconds(seconds);

      if (seconds <= 0 && !expirationHandledRef.current) {
        expirationHandledRef.current = true;

        expirationTimeoutId = window.setTimeout(() => {
          void getBookingCheckout(activeCheckout.token)
            .then((freshCheckout) => {
              if (freshCheckout.status === "EXPIRED") {
                onExpired();
                return;
              }

              if (freshCheckout.status === "CANCELLED") {
                onCancelled();
                return;
              }

              /*
               * The browser clock reached zero slightly before the
               * authoritative server deadline. Allow another check.
               */
              expirationHandledRef.current = false;
            })
            .catch(() => {
              /*
               * Never destroy a valid flow because a status request
               * temporarily failed. Keep the Checkout visible and retry
               * server reconciliation on the next timer cycle.
               */
              expirationHandledRef.current = false;

              setError(
                "مهلت پرداخت به پایان رسیده، اما بررسی نهایی وضعیت با سرور انجام نشد. اتصال اینترنت را بررسی کنید.",
              );
            });
        }, 1000);
      }
    }

    updateCountdown();

    const interval = window.setInterval(updateCountdown, 1000);

    return () => {
      window.clearInterval(interval);

      if (expirationTimeoutId !== null) {
        window.clearTimeout(expirationTimeoutId);
      }
    };
  }, [checkout, onCancelled, onExpired, phase]);

  async function handleCancel() {
    if (cancelling) {
      return;
    }

    setCancelling(true);
    setError(null);

    try {
      if (checkout) {
        await cancelBookingCheckout(checkout.token);
      } else {
        /*
         * This fallback is only used if Checkout creation failed
         * before a Checkout token was available.
         */
        await cancelBookingHold(hold.token);
      }

      onCancelled();
    } catch {
      setError("لغو رزرو موقت انجام نشد. لطفاً دوباره تلاش کنید.");

      setCancelling(false);
    }
  }

  function retryCheckout() {
    setError(null);
    setPhase("loading");

    setRequestRevision((revision) => revision + 1);
  }

  if (phase === "loading") {
    return (
      <div className="mt-5 rounded-[26px] border border-[var(--bw-border)] bg-[var(--bw-surface)] p-6 shadow-[var(--bw-shadow-card)]">
        <div className="flex min-h-[250px] flex-col items-center justify-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[var(--bw-primary-50)] text-[var(--bw-primary-600)]">
            <LoaderCircle size={26} className="animate-spin" />
          </span>

          <h2 className="mt-4 text-[13px] font-black text-slate-800">
            در حال آماده‌سازی پرداخت
          </h2>

          <p className="mt-2 max-w-[290px] text-[8px] leading-5 text-slate-400">
            اطلاعات خودرو و رزرو توسط سرور بررسی می‌شود. در این مرحله هنوز هیچ
            رزرو قطعی ایجاد نمی‌شود.
          </p>
        </div>
      </div>
    );
  }

  if (phase === "error" || !checkout) {
    return (
      <div className="mt-5">
        <div className="rounded-[24px] border border-red-100 bg-red-50 p-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-white text-red-500 shadow-sm">
            <AlertCircle size={20} />
          </span>

          <h2 className="mt-4 text-[13px] font-black text-red-700">
            آماده‌سازی پرداخت انجام نشد
          </h2>

          <p className="mt-2 text-[8px] leading-5 text-red-500">{error}</p>

          <button
            type="button"
            onClick={retryCheckout}
            className="mt-4 min-h-[50px] w-full rounded-[15px] bg-white text-[9px] font-black text-red-600 shadow-sm"
          >
            تلاش دوباره
          </button>
        </div>

        <button
          type="button"
          disabled={cancelling}
          onClick={() => {
            void handleCancel();
          }}
          className="mt-3 min-h-[50px] w-full rounded-[15px] border border-red-100 bg-red-50 text-[9px] font-black text-red-600 disabled:opacity-60"
        >
          {cancelling ? "در حال لغو رزرو..." : "لغو رزرو"}
        </button>
      </div>
    );
  }

  const countdownUrgent = remainingSeconds <= 120;

  return (
    <div className="mt-5">
      <div
        className={`rounded-[20px] border p-4 ${
          countdownUrgent
            ? "border-amber-200 bg-amber-50"
            : "border-blue-100 bg-[var(--bw-primary-50)]"
        }`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-white shadow-sm ${
              countdownUrgent
                ? "text-amber-600"
                : "text-[var(--bw-primary-600)]"
            }`}
          >
            <TimerReset size={20} />
          </span>

          <div className="min-w-0 flex-1">
            <p
              className={`text-[8px] font-black ${
                countdownUrgent
                  ? "text-amber-700"
                  : "text-[var(--bw-primary-600)]"
              }`}
            >
              مهلت تکمیل پرداخت
            </p>

            <p className="mt-1 text-[7px] leading-4 text-slate-500">
              این همان مهلت هشت‌دقیقه‌ای مرحله قبل است و ورود به این مرحله یا
              بارگذاری دوباره صفحه آن را تمدید نمی‌کند.
            </p>
          </div>

          <div
            dir="ltr"
            className={`shrink-0 rounded-[12px] bg-white px-3 py-2 text-[13px] font-black shadow-sm ${
              countdownUrgent ? "text-amber-600" : "text-[#0d6de0]"
            }`}
          >
            {formatCountdown(remainingSeconds)}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-[26px] border border-[var(--bw-primary-200)] bg-[var(--bw-surface)] p-5 shadow-[var(--bw-shadow-card)]">
        <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[var(--bw-primary-50)] text-[var(--bw-primary-600)]">
          <CreditCard size={22} />
        </span>

        <p className="mt-4 text-[9px] font-extrabold text-[var(--bw-primary-600)]">
          مرحله پنجم
        </p>

        <h2 className="mt-1 text-[16px] font-black text-slate-800">
          ثبت نهایی و پرداخت
        </h2>

        <p className="mt-2 text-[9px] leading-5 text-slate-500">
          اطلاعات خودرو و رزرو با موفقیت برای مرحله پرداخت آماده شده‌اند. هنوز
          هیچ رزرو قطعی ثبت نشده است.
        </p>

        <div className="mt-5 rounded-[18px] border border-emerald-100 bg-emerald-50 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2
              size={19}
              className="mt-0.5 shrink-0 text-emerald-600"
            />

            <div>
              <p className="text-[9px] font-black text-emerald-700">
                اطلاعات پرداخت آماده است
              </p>

              <p className="mt-1 text-[7px] leading-4 text-emerald-600">
                قیمت، خودرو و ظرفیت توسط سامانه بررسی شده‌اند و این مرحله هنوز
                موقت است.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-[15px] bg-[var(--bw-bg)] p-3">
            <p className="text-[7px] text-slate-400">پکیج</p>

            <p className="mt-1 text-[9px] font-black text-slate-700">
              {hold.package.nameFa}
            </p>
          </div>

          <div className="rounded-[15px] bg-[var(--bw-primary-50)] p-3">
            <p className="text-[7px] text-slate-400">مبلغ قابل پرداخت</p>

            <p className="mt-1 text-[9px] font-black text-[#0d6de0]">
              {formatToman(checkout.amountRial)}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-3 rounded-[16px] border border-blue-100 bg-blue-50/60 p-3">
          <ShieldCheck
            size={18}
            className="mt-0.5 shrink-0 text-[var(--bw-primary-600)]"
          />

          <p className="text-[7px] leading-4 text-slate-500">
            بارگذاری دوباره این صفحه رزرو جدیدی ایجاد نمی‌کند. ثبت قطعی فقط بعد
            از تأیید موفق پرداخت انجام می‌شود.
          </p>
        </div>

        <div className="mt-4 border-t border-[var(--bw-border)] pt-4">
          {checkingAuth ? (
            <div className="flex min-h-24 items-center justify-center text-[9px] text-slate-400">
              <LoaderCircle size={17} className="ml-2 animate-spin" />
              بررسی حساب کاربری
            </div>
          ) : profile ? (
            <div>
              <div className="rounded-[15px] bg-emerald-50 p-3 text-[9px] font-bold text-emerald-700">
                پرداخت برای{" "}
                {[profile.firstName, profile.lastName]
                  .filter(Boolean)
                  .join(" ") || "کاربر عزیز"}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {(["OWNER", "DELEGATE"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPickupMode(mode)}
                    className={`min-h-11 rounded-[13px] border text-[8px] font-black ${pickupMode === mode ? "border-blue-400 bg-blue-50 text-blue-700" : "border-[var(--bw-border)] text-slate-500"}`}
                  >
                    {mode === "OWNER"
                      ? "تحویل توسط خودم"
                      : "تحویل توسط شخص دیگر"}
                  </button>
                ))}
              </div>

              {pickupMode === "DELEGATE" ? (
                <div className="mt-3 space-y-2 rounded-[16px] bg-[var(--bw-bg)] p-3">
                  <input
                    value={delegateName}
                    onChange={(event) => setDelegateName(event.target.value)}
                    placeholder="نام تحویل‌گیرنده"
                    className="min-h-11 w-full rounded-[12px] border border-[var(--bw-border)] bg-white px-3 text-[9px] outline-none"
                  />
                  <input
                    dir="ltr"
                    inputMode="tel"
                    value={delegateMobile}
                    onChange={(event) => setDelegateMobile(event.target.value)}
                    placeholder="09123456789"
                    className="min-h-11 w-full rounded-[12px] border border-[var(--bw-border)] bg-white px-3 text-left text-[9px] outline-none"
                  />
                  <p className="text-[7px] leading-4 text-amber-700">
                    کد تحویل خودرو به این شماره پیامک خواهد شد؛ شماره را با دقت
                    وارد کنید.
                  </p>
                </div>
              ) : null}

              {(profile.wallet?.balanceRial ?? 0) > 0 ? (
                <label className="mt-3 flex items-center gap-3 rounded-[15px] border border-blue-100 bg-blue-50 p-3 text-[8px] font-bold text-blue-700">
                  <input
                    type="checkbox"
                    checked={useWallet}
                    onChange={(event) => setUseWallet(event.target.checked)}
                  />
                  استفاده از موجودی کیف پول (
                  {formatToman(profile.wallet?.balanceRial ?? 0)})
                </label>
              ) : null}

              <label className="mt-3 block rounded-[15px] border border-[var(--bw-border)] bg-white p-3">
                <span className="text-[10px] font-bold text-slate-600">
                  کد تخفیف
                </span>
                <div className="mt-2 flex gap-2">
                  <input
                    dir="ltr"
                    value={couponCode}
                    onChange={(event) => {
                      setCouponCode(event.target.value.toUpperCase());
                      setQuote(null);
                    }}
                    placeholder="کد تخفیف"
                    className="min-h-11 min-w-0 flex-1 rounded-[12px] bg-slate-50 px-3 text-center text-[12px] font-black tracking-wider text-blue-700 outline-none"
                  />
                  <button
                    type="button"
                    disabled={quoting || !couponCode.trim()}
                    onClick={() => void applyCoupon()}
                    className="min-h-11 shrink-0 rounded-[12px] bg-blue-50 px-4 text-[9px] font-black text-blue-700 disabled:opacity-50"
                  >
                    {quoting ? "بررسی..." : "اعمال"}
                  </button>
                </div>
                {quote ? (
                  <span className="mt-2 block text-[9px] font-bold leading-5 text-emerald-600">
                    تخفیف {formatToman(quote.discountAmountRial)} اعمال شد؛
                    پرداخت درگاه {formatToman(quote.gatewayAmountRial)}.
                  </span>
                ) : (
                  <span className="mt-2 block text-[9px] leading-5 text-slate-400">
                    کد را وارد و دکمه اعمال را بزنید.
                  </span>
                )}
              </label>

              <button
                type="button"
                disabled={paying}
                onClick={() => void handlePayment()}
                className="mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[15px] bg-[var(--bw-primary-600)] text-[10px] font-black text-white shadow-[var(--bw-shadow-blue)] disabled:opacity-60"
              >
                {paying ? (
                  <LoaderCircle size={17} className="animate-spin" />
                ) : (
                  <CreditCard size={17} />
                )}
                {paying ? "در حال اتصال..." : "پرداخت و ثبت نهایی"}
              </button>
            </div>
          ) : (
            <div>
              <p className="mb-3 text-[9px] font-black text-slate-700">
                برای پرداخت وارد حساب شو
              </p>
              <AuthPanel onAuthenticated={setProfile} />
            </div>
          )}
        </div>

        {error ? (
          <p className="mt-3 rounded-[13px] bg-red-50 p-3 text-[8px] text-red-600">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          disabled={cancelling}
          onClick={() => {
            void handleCancel();
          }}
          className="mt-3 min-h-[50px] w-full rounded-[15px] border border-red-100 bg-red-50 text-[9px] font-black text-red-600 disabled:opacity-60"
        >
          {cancelling ? "در حال لغو رزرو..." : "لغو رزرو"}
        </button>
      </div>
    </div>
  );
}
