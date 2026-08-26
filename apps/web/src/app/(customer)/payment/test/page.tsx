"use client";

import { CheckCircle2, CreditCard, LoaderCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { completeTestPayment } from "../../../../lib/api/account";

export default function TestPaymentPage() {
  return (
    <Suspense fallback={null}>
      <TestPaymentContent />
    </Suspense>
  );
}

function TestPaymentContent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const paymentId = useSearchParams().get("paymentId") ?? "";
  async function complete() {
    setLoading(true);
    setError(null);
    try {
      const result = await completeTestPayment(paymentId);
      window.location.assign(
        result.bookingId ? `/bookings/${result.bookingId}` : "/bookings",
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "پرداخت آزمایشی ناموفق بود.",
      );
      setLoading(false);
    }
  }
  return (
    <div className="px-5 pb-6 pt-8">
      <div className="rounded-[26px] border border-blue-100 bg-white p-6 text-center shadow-[var(--bw-shadow-card)]">
        <CreditCard className="mx-auto text-blue-600" size={34} />
        <h1 className="mt-4 text-[16px] font-black text-slate-800">
          درگاه آزمایشی BestWash
        </h1>
        <p className="mt-2 text-[8px] leading-5 text-slate-500">
          این صفحه فقط در محیط Development فعال است و هیچ تراکنش بانکی واقعی
          انجام نمی‌دهد.
        </p>
        {error ? (
          <p className="mt-4 rounded-[13px] bg-red-50 p-3 text-[8px] text-red-600">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          disabled={!paymentId || loading}
          onClick={() => void complete()}
          className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-emerald-600 text-[10px] font-black text-white disabled:opacity-50"
        >
          {loading ? (
            <LoaderCircle size={17} className="animate-spin" />
          ) : (
            <CheckCircle2 size={17} />
          )}
          تأیید پرداخت آزمایشی
        </button>
      </div>
    </div>
  );
}
