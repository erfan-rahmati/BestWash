import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/auth/",
          "/profile/",
          "/bookings/",
          "/vehicles/",
          "/wallet/",
          "/loyalty/",
          "/notifications/",
          "/settings/",
          "/support/",
          "/payment/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
