"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Zap, Clock, ArrowRight, Flame } from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import type { Product } from "@/lib/types/product";

interface FlashSaleSectionProps {
  products: Product[];
}

function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState({
    hours: 14,
    minutes: 25,
    seconds: 40,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else {
          return { hours: 23, minutes: 59, seconds: 59 };
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2.5 bg-neutral-100 border border-neutral-200 rounded-lg px-3.5 py-2">
      <Clock className="h-4 w-4 text-neutral-700 shrink-0" />
      <span className="text-xs font-bold text-neutral-700 mr-1">Ends In:</span>
      <div className="flex items-center gap-1 font-mono text-xs font-bold">
        <span className="rounded bg-neutral-900 px-2 py-1 text-white">{String(timeLeft.hours).padStart(2, "0")}h</span>
        <span className="text-neutral-900 font-bold">:</span>
        <span className="rounded bg-neutral-900 px-2 py-1 text-white">{String(timeLeft.minutes).padStart(2, "0")}m</span>
        <span className="text-neutral-900 font-bold">:</span>
        <span className="rounded bg-neutral-900 px-2 py-1 text-white">{String(timeLeft.seconds).padStart(2, "0")}s</span>
      </div>
    </div>
  );
}

export default function FlashSaleSection({ products }: FlashSaleSectionProps) {
  if (!products || products.length === 0) return null;

  return (
    <section className="max-w-[1400px] mx-auto px-3 sm:px-6 my-4 sm:my-6">
      <div className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-6 text-neutral-900 shadow-sm">
        {/* Header with Live Countdown */}
        <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500 text-white shrink-0 shadow-xs">
              <Zap className="h-5 w-5 fill-white text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-red-100 text-red-700 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider border border-red-200">
                  FLASH SALE
                </span>
                <span className="flex items-center gap-1 text-xs text-red-600 font-bold">
                  <Flame className="h-3.5 w-3.5 fill-red-600 text-red-600" /> Up to 60% OFF
                </span>
              </div>
              <h2 className="font-serif text-xl sm:text-2xl font-extrabold tracking-tight text-neutral-900 mt-0.5">
                Today&apos;s Mega Flash Deals
              </h2>
            </div>
          </div>

          {/* Countdown Clock */}
          <CountdownTimer />
        </div>

        {/* Deals Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {products.slice(0, 10).map((product, index) => {
            const soldPercent = Math.min(88, 45 + (index * 8) % 40);
            const itemsLeft = Math.max(2, 14 - index);

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.03, 0.3) }}
                className="flex flex-col justify-between"
              >
                <ProductCard
                  product={product}
                  imageSizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                />

                {/* Stock progress bar */}
                <div className="mt-2 px-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-neutral-700 mb-1">
                    <span className="text-red-600 font-extrabold">🔥 {soldPercent}% Sold</span>
                    <span className="text-neutral-500 font-semibold">{itemsLeft} left</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
                    <div
                      className="h-full rounded-full bg-red-600 transition-all duration-500"
                      style={{ width: `${soldPercent}%` }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom Link */}
        <div className="mt-4 pt-3 border-t border-neutral-200 flex items-center justify-between">
          <p className="text-xs text-neutral-500 font-medium">Limited promotional stock available in Nepal</p>
          <Link
            href="/products?featured=true"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-900 hover:text-red-600 hover:underline transition-colors"
          >
            All Flash Deals <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
