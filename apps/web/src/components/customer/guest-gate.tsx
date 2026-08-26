import Link from "next/link";
import { LockKeyhole } from "lucide-react";

export function GuestGate({
  title = "برای مشاهده این بخش وارد شوید",
  description = "برای مشاهده اطلاعات شخصی و مدیریت این بخش، وارد حساب بست‌واش شوید یا یک حساب تازه بسازید.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="rounded-[26px] border border-blue-100 bg-[linear-gradient(145deg,#fff,#eef7ff)] p-6 text-center shadow-[var(--bw-shadow-card)]">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-[19px] bg-blue-600 text-white shadow-[var(--bw-shadow-blue)]">
        <LockKeyhole size={24} />
      </span>
      <h2 className="mt-4 text-[15px] font-black text-slate-800">{title}</h2>
      <p className="mx-auto mt-2 max-w-[300px] text-[11px] leading-6 text-slate-500">
        {description}
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Link
          href="/auth"
          className="flex min-h-12 items-center justify-center rounded-[15px] bg-blue-600 text-[12px] font-black text-white"
        >
          ورود
        </Link>
        <Link
          href="/auth?mode=register"
          className="flex min-h-12 items-center justify-center rounded-[15px] border border-blue-200 bg-white text-[12px] font-black text-blue-700"
        >
          ثبت‌نام
        </Link>
      </div>
    </div>
  );
}
