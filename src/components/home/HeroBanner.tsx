"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Banner } from "@/lib/types/banner";

interface HeroBannerProps {
  banners: Banner[];
}

const FALLBACK_BANNERS = [
  {
    id: "adivasi-hair-oil",
    title: "Adivasi Vishvambhari Herbal Hair Oil",
    subtitle: "Save big on authentic recipes & 100% genuine herbal essentials",
    image: "/images/hero/Adivasi.jpg",
    buttonText: "Shop Now",
    linkValue: "/products?q=hair+oil",
    badge: "FLAT 50% OFF",
  },
  {
    id: "japanese-soothing-massage-gel",
    title: "Japanese Soothing Massage Gel",
    subtitle: "Premium natural relief & relaxation formula",
    image: "/images/hero/japan.jpg",
    buttonText: "Shop Now",
    linkValue: "/products?q=massage+gel",
    badge: "BESTSELLER",
  },
  {
    id: "paras-product",
    title: "Paras Herbal Essentials",
    subtitle: "Authentic herbal care for hair & skin wellness",
    image: "/images/hero/paras.jpg",
    buttonText: "Shop Now",
    linkValue: "/products?q=paras",
    badge: "SPECIAL OFFER",
  },
  {
    id: "dashain",
    title: "Maha Dashain Mega Dhamaka",
    subtitle: "Exclusive festival discounts on all top categories",
    image: "/images/hero/Fashain.jpg",
    buttonText: "Shop Dashain Deals",
    linkValue: "/categories/fashion",
    badge: "DASHAIN SALE",
  },
  {
    id: "tihar",
    title: "Tihar Lights & Celebration Sale",
    subtitle: "Brighten your home with special festive offers",
    image: "/images/hero/Tihar.jpg",
    buttonText: "Explore Tihar Specials",
    linkValue: "/categories/home",
    badge: "TIHAR SPECIAL",
  },
];

const DEFAULT_HERO_BACKUP =
  "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1600&q=80";

function resolveBannerHref(slide: Banner | (typeof FALLBACK_BANNERS)[0]): string {
  if ("linkType" in slide) {
    const banner = slide as Banner;
    const { linkType, linkValue, title } = banner;

    if (linkType === "category" && linkValue) {
      return `/categories/${linkValue}`;
    }
    if (linkType === "product" && linkValue) {
      return `/products/${linkValue}`;
    }
    if (linkType === "url" && linkValue) {
      if (linkValue === "/products" || linkValue === "/products?featured=true") {
        if (title) return `/products?q=${encodeURIComponent(title.trim())}`;
      }
      return linkValue.startsWith("/") ? linkValue : `/${linkValue}`;
    }
    if (title) {
      return `/products?q=${encodeURIComponent(title.trim())}`;
    }
    return "/products";
  }

  const fallbackSlide = slide as (typeof FALLBACK_BANNERS)[0];
  if (
    fallbackSlide.linkValue &&
    fallbackSlide.linkValue !== "/products" &&
    fallbackSlide.linkValue !== "/products?featured=true"
  ) {
    return fallbackSlide.linkValue;
  }

  if (fallbackSlide.title) {
    return `/products?q=${encodeURIComponent(fallbackSlide.title.trim())}`;
  }

  return "/products";
}

export default function HeroBanner({ banners }: HeroBannerProps) {
  const slides = banners.length > 0 ? banners : FALLBACK_BANNERS;
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (isPaused || slides.length <= 1) return;
    const interval = setInterval(next, 5000);
    return () => clearInterval(interval);
  }, [next, isPaused, slides.length]);

  const getSlideImage = (slide: Banner | (typeof FALLBACK_BANNERS)[0], idx: number) => {
    const raw =
      (slide as Banner).image ||
      (slide as (typeof FALLBACK_BANNERS)[0]).image ||
      DEFAULT_HERO_BACKUP;
    const slideId = slide.id || `slide-${idx}`;
    return failedImages[slideId] ? DEFAULT_HERO_BACKUP : raw;
  };

  // Determine indices for 3-card desktop grid
  const total = slides.length;
  const indices = [
    current % total,
    total >= 2 ? (current + 1) % total : 0,
    total >= 3 ? (current + 2) % total : 0,
  ];

  return (
    <section
      className="max-w-[1400px] mx-auto px-3 sm:px-6 my-2 sm:my-4 relative group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* 3-Card Carousel Grid for Desktop (IMAGE 2 DESIGN) */}
      <div className="relative w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 lg:gap-5">
          {indices.map((slideIndex, gridPos) => {
            const slide = slides[slideIndex] || slides[0];
            const imgUrl = getSlideImage(slide, slideIndex);
            const isHiddenOnMobile = gridPos > 0;

            return (
              <AnimatePresence key={`${slideIndex}-${gridPos}`} mode="wait">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    "relative w-full overflow-hidden rounded-2xl lg:rounded-3xl border border-slate-200/80 bg-white shadow-sm hover:shadow-lg transition-all duration-300",
                    isHiddenOnMobile ? "hidden md:block" : "block"
                  )}
                >
                  <Link
                    href={resolveBannerHref(slide)}
                    className="relative block w-full aspect-[16/9] cursor-pointer overflow-hidden rounded-2xl lg:rounded-3xl bg-slate-100"
                    aria-label={(slide as Banner).title || "Promotional Banner"}
                  >
                    <Image
                      src={imgUrl}
                      alt={(slide as Banner).title || "NexShop Hero Banner"}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-contain rounded-2xl lg:rounded-3xl transition-transform duration-300 hover:scale-[1.02]"
                      priority={gridPos === 0}
                      onError={() => {
                        const sId = slide.id || `slide-${slideIndex}`;
                        setFailedImages((prev) => ({ ...prev, [sId]: true }));
                      }}
                      referrerPolicy="no-referrer"
                    />
                  </Link>
                </motion.div>
              </AnimatePresence>
            );
          })}
        </div>

        {/* Navigation Arrows */}
        {slides.length > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Previous banner"
              className="flex absolute -left-2 sm:-left-4 lg:-left-5 top-1/2 z-20 h-10 w-10 sm:h-11 sm:w-11 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900/90 text-white border border-slate-700/80 backdrop-blur-md transition-all hover:bg-slate-950 hover:scale-110 shadow-xl cursor-pointer"
            >
              <ChevronLeft className="h-6 w-6 text-slate-100" />
            </button>
            <button
              onClick={next}
              aria-label="Next banner"
              className="flex absolute -right-2 sm:-right-4 lg:-right-5 top-1/2 z-20 h-10 w-10 sm:h-11 sm:w-11 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900/90 text-white border border-slate-700/80 backdrop-blur-md transition-all hover:bg-slate-950 hover:scale-110 shadow-xl cursor-pointer"
            >
              <ChevronRight className="h-6 w-6 text-slate-100" />
            </button>
          </>
        )}
      </div>

      {/* Pagination Dots Centered Below */}
      {slides.length > 1 && (
        <div className="flex items-center justify-center gap-2 mt-3 sm:mt-4">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={cn(
                "h-2 rounded-full transition-all duration-300 cursor-pointer",
                i === current
                  ? "w-8 bg-blue-600 shadow-md shadow-blue-500/30"
                  : "w-2 bg-slate-300 hover:bg-slate-400"
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}
