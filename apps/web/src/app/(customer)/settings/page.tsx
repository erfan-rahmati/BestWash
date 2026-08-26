import { SettingsPanel } from "../../../components/customer/settings-panel";
import { PageHeading } from "../../../components/ui/page-heading";

export default function SettingsPage() {
  return (
    <div className="px-5 pb-6 pt-6">
      <PageHeading
        eyebrow="شخصی‌سازی"
        title="تنظیمات"
        description="روش دریافت اعلان‌ها و پیام‌های BestWash را انتخاب کنید."
      />
      <div className="mt-6">
        <SettingsPanel />
      </div>
    </div>
  );
}
