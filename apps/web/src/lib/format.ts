export const bookingStatusFa: Record<string, string> = {
  PENDING_PAYMENT: "در انتظار پرداخت",
  UNDER_REVIEW: "در حال بررسی ادمین",
  ADMIN_REJECTED: "ردشده و بازپرداخت‌شده",
  CONFIRMED: "تأییدشده",
  CHECKED_IN: "پذیرش‌شده",
  IN_QUEUE: "در صف شست‌وشو",
  IN_PROGRESS: "در حال انجام",
  READY_FOR_PICKUP: "آماده تحویل",
  DELIVERED: "تحویل‌شده",
  COMPLETED: "تکمیل‌شده",
  CANCELLED: "لغوشده",
  NO_SHOW: "عدم مراجعه",
};

export const transactionTypeFa: Record<string, string> = {
  CASHBACK: "اعتبار بازگشتی",
  PAYMENT: "پرداخت رزرو",
  REFUND: "بازپرداخت رزرو",
  REVERSAL: "برگشت تراکنش",
  PROMOTIONAL_CREDIT: "اعتبار هدیه",
  MANUAL_CREDIT: "افزایش اعتبار",
  MANUAL_DEBIT: "کاهش اعتبار",
  EXPIRATION: "انقضای اعتبار",
};

export function bookingStatusClasses(status: string) {
  if (["UNDER_REVIEW", "PENDING_PAYMENT"].includes(status))
    return "border-amber-200 bg-amber-50 text-amber-700";
  if (["CONFIRMED", "CHECKED_IN"].includes(status))
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (["ADMIN_REJECTED", "CANCELLED", "NO_SHOW"].includes(status))
    return "border-rose-200 bg-rose-50 text-rose-700";
  if (["READY_FOR_PICKUP"].includes(status))
    return "border-violet-200 bg-violet-50 text-violet-700";
  if (["IN_QUEUE", "IN_PROGRESS"].includes(status))
    return "border-cyan-200 bg-cyan-50 text-cyan-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

export function formatToman(amountRial: unknown) {
  return `${new Intl.NumberFormat("fa-IR").format(Math.round(Number(amountRial ?? 0) / 10))} تومان`;
}

export function formatDateTime(value: unknown) {
  const date = new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDate(value: unknown) {
  const date = new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}
