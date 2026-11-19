import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import ProductCardSkeleton from "@/components/product/ProductCardSkeleton";
import type { Product } from "@/lib/types/product";

interface ProductSectionProps {
  title: string;
  subtitle?: string;
  products: Product[];
  viewAllHref?: string;
  loading?: boolean;
  badge?: string;
}

export default function ProductSection({
  title,
  subtitle,
  products,
  viewAllHref,
  loading = false,
  badge,
}: ProductSectionProps) {
  return (
    <section className="max-w-[1400px] mx-auto px-3 sm:px-6 my-4 sm:my-6">
      <div className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5 shadow-2xs">
        {/* Section Header */}
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-neutral-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-base sm:text-xl font-bold tracking-tight text-black">
                {title}
              </h2>
              {badge && (
                <span className="rounded-md bg-black px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-white uppercase tracking-wider">
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="mt-0.5 text-[11px] sm:text-xs text-neutral-500 font-medium hidden sm:block">
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {viewAllHref && (
              <Link
                href={viewAllHref}
                className="text-xs font-bold text-black hover:underline flex items-center gap-1"
              >
                View All <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>

        {/* Display products in responsive vertical grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {loading
            ? Array.from({ length: 10 }).map((_, i) => (
                <div key={i}>
                  <ProductCardSkeleton />
                </div>
              ))
            : products.slice(0, 10).map((product) => (
                <div key={product.id}>
                  <ProductCard
                    product={product}
                    imageSizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                  />
                </div>
              ))}
        </div>

        {!loading && products.length === 0 && (
          <div className="flex w-full items-center justify-center py-10 text-xs text-neutral-500 font-medium">
            No products found
          </div>
        )}
      </div>
    </section>
  );
}
