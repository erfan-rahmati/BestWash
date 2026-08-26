import { AccountDataView } from "../../../components/customer/account-data-view";
import { PageHeading } from "../../../components/ui/page-heading";

export default function LoyaltyPage() {
  return (
    <div className="px-5 pb-6 pt-6">
      <PageHeading
        eyebrow="باشگاه مشتریان"
        title="امتیاز و دستاوردها"
        description="امتیازها، سطح عضویت و پاداش‌های BestWash را یک‌جا ببین."
      />
      <div className="mt-6">
        <AccountDataView kind="loyalty" />
      </div>
    </div>
  );
}
