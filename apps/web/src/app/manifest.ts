import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BestWash | رزرو آنلاین کارواش",
    short_name: "BestWash",
    description: "رزرو، پرداخت و پیگیری خدمات کارواش BestWash",
    start_url: "/",
    display: "standalone",
    background_color: "#e9f2fc",
    theme_color: "#0d6de0",
    lang: "fa",
    dir: "rtl",
    categories: ["lifestyle", "business"],
    icons: [
      {
        src: "/icons/app-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/app-icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
