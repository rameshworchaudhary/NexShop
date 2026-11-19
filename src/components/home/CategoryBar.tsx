"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

const CATEGORY_ITEMS = [
  { name: "For You", slug: "for-you", icon: "✨" },
  { name: "Mobiles", slug: "mobiles", icon: "📱" },
  { name: "Electronics", slug: "electronics", icon: "💻" },
  { name: "Fashion", slug: "fashion", icon: "👗" },
  { name: "Beauty", slug: "beauty", icon: "💄" },
  { name: "Home", slug: "home", icon: "🏠" },
  { name: "Appliances", slug: "appliances", icon: "⚡" },
  { name: "Kitchen", slug: "kitchen", icon: "🍳" },
  { name: "Sports", slug: "sports", icon: "⚽" },
  { name: "Furniture", slug: "furniture", icon: "🛋️" },
  { name: "Books", slug: "books", icon: "📚" },
  { name: "Grocery", slug: "grocery", icon: "🛒" },
  { name: "2 Wheelers", slug: "2-wheelers", icon: "🏍️" },
];

export default function CategoryBar() {
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -320 : 320;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <div className="border-b border-neutral-200 bg-white py-2.5">
      <div className="container mx-auto px-2 sm:px-6 relative flex items-center">
        {/* Left Scroll Button */}
        <button
          onClick={() => scroll("left")}
          aria-label="Scroll left"
          className="hidden md:flex absolute left-2 z-10 h-7 w-7 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-800 shadow-xs transition-all hover:bg-black hover:text-white hover:border-black"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Categories Horizontal Track */}
        <div
          ref={scrollRef}
          className="flex w-full items-center justify-start md:justify-between gap-4 md:gap-6 overflow-x-auto scrollbar-hide py-1 px-1 md:px-8"
        >
          {CATEGORY_ITEMS.map((cat, idx) => {
            const href = cat.slug === "for-you" ? "/" : `/categories/${cat.slug}`;
            const isActive = (idx === 0 && pathname === "/") || pathname === href;
            const isForYou = cat.slug === "for-you";

            return (
              <Link
                key={cat.slug}
                href={href}
                className={`group flex flex-col items-center shrink-0 min-w-[68px] sm:min-w-[78px] transition-all relative pb-2 ${
                  isActive ? "text-slate-950 font-bold" : "text-slate-600 font-medium hover:text-slate-900"
                }`}
              >
                <div
                  className={`flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl text-xl sm:text-2xl transition-all duration-200 group-hover:scale-105 shadow-xs ${
                    isForYou
                      ? "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-amber-300 border border-slate-800 shadow-md"
                      : isActive
                      ? "bg-slate-900 text-white shadow-md"
                      : "bg-white text-slate-800 border border-slate-200/90 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {isForYou ? "✨" : cat.icon}
                </div>
                <span className="text-[11px] sm:text-xs mt-2 whitespace-nowrap tracking-tight font-semibold">
                  {cat.name}
                </span>

                {/* Active Underline Indicator */}
                {isActive && (
                  <span className="absolute bottom-0 h-1 w-8 rounded-full bg-slate-950" />
                )}
              </Link>
            );
          })}

          {/* More Link */}
          <Link
            href="/categories"
            className={`group flex flex-col items-center shrink-0 min-w-[62px] sm:min-w-[72px] transition-all relative pb-1.5 ${
              pathname === "/categories" ? "text-black font-bold" : "text-neutral-600 font-medium hover:text-black"
            }`}
          >
            <div
              className={`flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl text-lg font-bold transition-all ${
                pathname === "/categories"
                  ? "bg-black text-white"
                  : "bg-neutral-100 text-neutral-800 group-hover:bg-neutral-200"
              }`}
            >
              •••
            </div>
            <span className="text-[11px] sm:text-xs mt-1.5 whitespace-nowrap">
              More
            </span>
            {pathname === "/categories" && (
              <span className="absolute bottom-0 h-0.5 w-8 rounded-full bg-black" />
            )}
          </Link>
        </div>

        {/* Right Scroll Button */}
        <button
          onClick={() => scroll("right")}
          aria-label="Scroll right"
          className="hidden md:flex absolute right-2 z-10 h-7 w-7 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-800 shadow-xs transition-all hover:bg-black hover:text-white hover:border-black"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
