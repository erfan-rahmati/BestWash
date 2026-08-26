import { SecurityPanel } from "../../../../components/customer/security-panel";
import { PageHeading } from "../../../../components/ui/page-heading";

export default function SecurityPage() {
  return (
    <div className="px-5 pb-6 pt-6">
      <PageHeading
        eyebrow="حفاظت از حساب"
        title="امنیت و رمز عبور"
        description="رمز ورود و نشست‌های فعال حساب را مدیریت کنید."
      />
      <div className="mt-6">
        <SecurityPanel />
      </div>
    </div>
  );
}
