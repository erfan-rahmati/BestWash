"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getApiBaseUrl } from "../../lib/api/base-url";

interface HeroSlide {
  id: string;
  imageUrl: string;
  altText: string;
  linkType: string;
  linkValue: string | null;
}

const fallback: HeroSlide[] = [1, 2, 3].map((index) => ({
  id: String(index),
  imageUrl: `/images/home/hero/hero-${index}.webp`,
  altText: `BestWash - اسلاید ${index}`,
  linkType: "INTERNAL",
  linkValue: "/booking",
}));

export function HomeHero() {
  const [slides, setSlides] = useState(fallback);
  const [active, setActive] = useState(0);

  useEffect(() => {
    fetch(`${getApiBaseUrl()}/content/home`)
      .then((response) => response.json())
      .then((payload) => {
        if (payload.data?.hero?.length) setSlides(payload.data.hero);
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(
      () => setActive((value) => (value + 1) % slides.length),
      6000,
    );
    return () => window.clearInterval(timer);
  }, [slides.length]);

  return (
    <section className="px-4 pt-3" aria-label="پیشنهادهای BestWash">
      <div className="relative aspect-[4/3.25] overflow-hidden rounded-[30px] border border-white/90 bg-white shadow-[0_22px_55px_rgba(35,103,178,0.13)]">
        {slides.map((slide, index) => {
          const image = (
            <Image
              src={slide.imageUrl}
              alt={slide.altText}
              fill
              priority={index === 0}
              sizes="(max-width: 440px) 100vw, 440px"
              className="object-cover"
            />
          );
          const href = slide.linkType === "NONE" ? null : slide.linkValue;
          return (
            <article
              key={slide.id}
              aria-hidden={active !== index}
              className={`absolute inset-0 transition-opacity duration-700 ${active === index ? "z-10 opacity-100" : "z-0 opacity-0"}`}
            >
              {href ? (
                <Link
                  href={href}
                  target={slide.linkType === "EXTERNAL" ? "_blank" : undefined}
                  className="relative block h-full w-full"
                >
                  {image}
                </Link>
              ) : (
                image
              )}
            </article>
          );
        })}
        <div className="absolute inset-x-0 bottom-4 z-20 flex justify-center gap-1.5">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`نمایش اسلاید ${index + 1}`}
              onClick={() => setActive(index)}
              className={`h-2 rounded-full border border-white/60 shadow ${active === index ? "w-6 bg-white" : "w-2 bg-white/60"}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
