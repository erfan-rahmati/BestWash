import { NotificationsCenter } from "../../../components/customer/notifications-center";
import { PageHeading } from "../../../components/ui/page-heading";

export default function NotificationsPage() {
  return (
    <div className="px-5 pb-6 pt-6">
      <PageHeading
        eyebrow="رویدادهای حساب"
        title="اعلان‌ها"
        description="پیام‌های رزرو، پرداخت، اعتبار و باشگاه مشتریان را اینجا ببینید."
      />
      <div className="mt-6">
        <NotificationsCenter />
      </div>
    </div>
  );
}
