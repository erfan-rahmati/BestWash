import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker explicitly asks for standalone output. Local production testing
  // keeps Next's standard layout so `pnpm --filter web start` works directly.
  output: process.env.BESTWASH_STANDALONE === "true" ? "standalone" : undefined,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  async rewrites() {
    const internalApiOrigin =
      process.env.BESTWASH_INTERNAL_API_URL ?? "http://127.0.0.1:3001";

    return [
      {
        source: "/api/:path*",
        destination: `${internalApiOrigin}/api/:path*`,
      },
    ];
  },
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value:
          "camera=(), microphone=(), geolocation=(), payment=(self), usb=()",
      },
    ];

    const privatePaths = [
      "admin",
      "auth",
      "profile",
      "bookings",
      "vehicles",
      "wallet",
      "loyalty",
      "notifications",
      "settings",
      "support",
      "payment",
    ];

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      ...privatePaths.map((path) => ({
        source: `/${path}/:path*`,
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      })),
    ];
  },
};

export default nextConfig;
