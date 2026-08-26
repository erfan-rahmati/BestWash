import { ActiveBooking } from "../../components/home/active-booking";
import { HomeHero } from "../../components/home/home-hero";
import { PromoBanner } from "../../components/home/promo-banner";
import { QuickActions } from "../../components/home/quick-actions";
import { ServiceGrid } from "../../components/home/service-grid";

export default function HomePage() {
  const localBusiness = {
    "@context": "https://schema.org",
    "@type": "AutoWash",
    name: "BestWash",
    url: process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000",
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      addressLocality: "بابلسر",
      addressRegion: "مازندران",
      addressCountry: "IR",
    },
    areaServed: "بابلسر",
    potentialAction: {
      "@type": "ReserveAction",
      target: `${process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000"}/booking`,
    },
  };
  return (
    <div className="pb-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(localBusiness).replace(/</g, "\\u003c"),
        }}
      />
      <HomeHero />

      <QuickActions />

      <PromoBanner />

      <ServiceGrid />

      <ActiveBooking />
    </div>
  );
}
