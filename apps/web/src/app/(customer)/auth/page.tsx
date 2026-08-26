import { AuthPanel } from "../../../components/auth/auth-panel";
import { PageHeading } from "../../../components/ui/page-heading";

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  return (
    <div className="px-5 pb-6 pt-6">
      <PageHeading
        eyebrow="حساب بست‌واش"
        title="ورود یا ثبت‌نام"
        description="برای ورود، کد یک‌بارمصرف یا رمز عبور را انتخاب کنید؛ ساخت حساب تازه هم فقط چند لحظه زمان می‌برد."
      />
      <div className="mt-6">
        <AuthPanel defaultIntent={mode === "register" ? "register" : "login"} />
      </div>
    </div>
  );
}
