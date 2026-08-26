import { AccountDataView } from "../../../components/customer/account-data-view";
import { PageHeading } from "../../../components/ui/page-heading";

export default function BookingsPage() {
  return (
    <div className="px-5 pb-4 pt-6">
      <PageHeading
        eyebrow="رزروهای BestWash"
        title="رزروهای من"
        description="رزروهای آینده و سوابق خدمات دریافت‌شده را از این قسمت پیگیری کن."
      />

      <div className="mt-6">
        <AccountDataView kind="bookings" />
      </div>
    </div>
  );
}
