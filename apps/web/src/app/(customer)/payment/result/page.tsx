import { PaymentResultCard } from "../../../../components/customer/payment-result-card";
export default async function PaymentResultPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    bookingId?: string;
    paymentId?: string;
  }>;
}) {
  const params = await searchParams;
  return (
    <PaymentResultCard
      success={params.status === "success"}
      bookingId={params.bookingId}
      paymentId={params.paymentId}
    />
  );
}
