"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getApiBaseUrl } from "../../lib/api/base-url";

interface Promo {
  imageUrl: string;
  altText: string;
  linkType: string;
  linkValue: string | null;
}

const fallback: Promo = {
  imageUrl: "/images/home/promo/promo-banner.webp",
  altText: "پیشنهاد ویژه BestWash",
  linkType: "INTERNAL",
  linkValue: "/booking",
};

export function PromoBanner() {
  const [promo, setPromo] = useState(fallback);
  useEffect(() => {
    fetch(`${getApiBaseUrl()}/content/home`)
      .then((response) => response.json())
      .then((payload) => payload.data?.promo && setPromo(payload.data.promo))
      .catch(() => null);
  }, []);
  const image = (
    <Image
      src={promo.imageUrl}
      alt={promo.altText}
      fill
      sizes="(max-width: 440px) 100vw, 440px"
      className="object-cover transition duration-500 hover:scale-[1.02]"
    />
  );
  return (
    <section className="px-5 pt-4">
      <div className="relative aspect-[16/6.1] overflow-hidden rounded-[24px] border border-blue-200/70 bg-blue-100 shadow-[0_16px_36px_rgba(13,109,224,0.20)]">
        {promo.linkType !== "NONE" && promo.linkValue ? (
          <Link
            href={promo.linkValue}
            target={promo.linkType === "EXTERNAL" ? "_blank" : undefined}
            className="relative block h-full w-full"
          >
            {image}
          </Link>
        ) : (
          image
        )}
      </div>
    </section>
  );
}
