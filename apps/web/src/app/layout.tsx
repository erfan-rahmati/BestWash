import "@fontsource-variable/vazirmatn/wght.css";
import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import { ToastProvider } from "@/components/ui/toast-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "BestWash | رزرو آنلاین کارواش در بابلسر",
    template: "%s | BestWash",
  },
  description:
    "رزرو آنلاین کارواش BestWash در بابلسر؛ انتخاب خودرو و خدمات، پرداخت امن و پیگیری لحظه‌ای وضعیت خودرو.",
  keywords: [
    "کارواش بابلسر",
    "رزرو آنلاین کارواش",
    "BestWash",
    "کارواش اتوماتیک",
  ],
  alternates: { canonical: "/" },
  applicationName: "BestWash",
  manifest: "/manifest.webmanifest",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000",
  ),
  openGraph: {
    type: "website",
    locale: "fa_IR",
    title: "BestWash | رزرو آنلاین کارواش",
    description: "رزرو سریع، پرداخت آنلاین و پیگیری خدمات کارواش BestWash",
    images: ["/images/home/hero/hero-1.webp"],
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#edf3f8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        {children}
        <ToastProvider />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
