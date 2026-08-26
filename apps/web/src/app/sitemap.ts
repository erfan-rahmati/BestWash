import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";
  return ["", "/booking", "/about", "/contact", "/blog", "/rules"].map(
    (path, index) => ({
      url: `${base}${path}`,
      lastModified: new Date(),
      changeFrequency: index === 0 ? "daily" : "weekly",
      priority: index === 0 ? 1 : index === 1 ? 0.9 : 0.7,
    }),
  );
}
