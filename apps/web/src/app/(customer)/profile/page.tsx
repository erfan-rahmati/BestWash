import { PageHeading } from "../../../components/ui/page-heading";
import { ProfileDashboard } from "../../../components/customer/profile-dashboard";

export default function ProfilePage() {
  return (
    <div className="px-5 pb-6 pt-6">
      <PageHeading
        eyebrow="حساب BestWash"
        title="پروفایل و تنظیمات"
        description="اطلاعات شخصی، امنیت و ترجیحات حساب خود را مدیریت کنید."
      />
      <div className="mt-6">
        <ProfileDashboard />
      </div>
    </div>
  );
}
