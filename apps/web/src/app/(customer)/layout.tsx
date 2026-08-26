import type { ReactNode } from "react";
import { CustomerAppShell } from "../../components/customer/customer-app-shell";

interface CustomerLayoutProps {
  children: ReactNode;
}

export default function CustomerLayout({ children }: CustomerLayoutProps) {
  return <CustomerAppShell>{children}</CustomerAppShell>;
}
