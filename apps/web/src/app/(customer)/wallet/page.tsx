import { AccountDataView } from "../../../components/customer/account-data-view";
import { PageHeading } from "../../../components/ui/page-heading";

export default function WalletPage() {
  return (
    <div className="px-5 pb-6 pt-6">
      <PageHeading
        eyebrow="اعتبار BestWash"
        title="کیف پول"
        description="موجودی، اعتبار بازگشتی و گردش کیف پول را ببین."
      />
      <div className="mt-6">
        <AccountDataView kind="wallet" />
      </div>
    </div>
  );
}
