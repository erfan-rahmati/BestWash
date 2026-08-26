import { BookingDetail } from "../../../../components/customer/booking-detail";
import { PageHeading } from "../../../../components/ui/page-heading";

export default async function BookingDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="px-5 pb-6 pt-6">
      <PageHeading
        eyebrow="پیگیری رزرو"
        title="جزئیات رزرو"
        description="وضعیت عملیات، پرداخت و تحویل خودرو را ببین."
      />
      <div className="mt-6">
        <BookingDetail id={id} />
      </div>
    </div>
  );
}
