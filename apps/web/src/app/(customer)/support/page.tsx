import { PageHeading } from "../../../components/ui/page-heading";
import { SupportCenter } from "../../../components/customer/support-center";

export default function SupportPage() {
  return (
    <div className="px-5 pb-6 pt-6">
      <PageHeading
        eyebrow="همراه شما"
        title="پشتیبانی"
        description="درخواست جدید ثبت کنید و پاسخ‌های تیم BestWash را پیگیری کنید."
      />
      <div className="mt-6">
        <SupportCenter />
      </div>
    </div>
  );
}
