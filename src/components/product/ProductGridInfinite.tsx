"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { PackageOpen, ShoppingBag, Loader2, CheckCircle2 } from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import ProductCardSkeleton from "@/components/product/ProductCardSkeleton";
import type { Product, ProductFilters } from "@/lib/types/product";

interface ProductGridInfiniteProps {
  initialProducts: Product[];
  initialHasMore: boolean;
  initialTotal: number;
  filters: ProductFilters;
  emptyMessage?: string;
}

export default function ProductGridInfinite({
  initialProducts,
  initialHasMore,
  initialTotal,
  filters,
  emptyMessage = "No products available matching your criteria.",
}: ProductGridInfiniteProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(initialHasMore);
  const [loading, setLoading] = useState<boolean>(false);
  const observerTarget = useRef<HTMLDivElement>(null);
  const requestInFlight = useRef(false);
  const activeRequest = useRef<AbortController | null>(null);

  // Sync state when initial props or filters change (e.g. user clicked a filter or sorted)
  useEffect(() => {
    activeRequest.current?.abort();
    activeRequest.current = null;
    requestInFlight.current = false;
    setProducts(initialProducts);
    setPage(1);
    setHasMore(initialHasMore);
    setLoading(false);
    return () => {
      activeRequest.current?.abort();
      activeRequest.current = null;
      requestInFlight.current = false;
    };
  }, [initialProducts, initialHasMore, filters]);

  const loadMore = useCallback(async () => {
    if (requestInFlight.current || loading || !hasMore) return;
    requestInFlight.current = true;
    const controller = new AbortController();
    activeRequest.current = controller;
    setLoading(true);

    try {
      const nextPage = page + 1;
      const params = new URLSearchParams();
      params.set("page", String(nextPage));
      params.set("pageSize", "20");

      if (filters.categoryId) params.set("categoryId", filters.categoryId);
      if (filters.subCategoryId) params.set("subCategoryId", filters.subCategoryId);
      if (filters.search) params.set("q", filters.search);
      if (filters.sortBy) params.set("sortBy", filters.sortBy);
      if (filters.minPrice !== undefined) params.set("minPrice", String(filters.minPrice));
      if (filters.maxPrice !== undefined) params.set("maxPrice", String(filters.maxPrice));
      if (filters.rating !== undefined) params.set("rating", String(filters.rating));
      if (filters.inStock) params.set("inStock", "true");
      if (filters.brand && filters.brand.length > 0) params.set("brand", filters.brand.join(","));

      const res = await fetch(`/api/products?${params.toString()}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("Failed to fetch next batch");

      const data = await res.json();
      if (controller.signal.aborted) return;
      if (data.products && Array.isArray(data.products)) {
        setProducts((prev) => {
          // Avoid duplicate product IDs
          const existingIds = new Set(prev.map((p) => p.id));
          const uniqueNew = data.products.filter((p: Product) => !existingIds.has(p.id));
          return [...prev, ...uniqueNew];
        });
        setPage(nextPage);
        setHasMore(Boolean(data.hasMore));
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        console.error("Error loading more products:", err);
      }
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        requestInFlight.current = false;
        setLoading(false);
      }
    }
  }, [loading, hasMore, page, filters]);

  // IntersectionObserver for infinite scrolling when bottom trigger element is reached
  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    );

    observer.observe(target);
    return () => {
      observer.unobserve(target);
    };
  }, [hasMore, loading, loadMore]);

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center px-4 rounded-2xl border border-neutral-200 bg-white shadow-2xs my-4">
        <div className="mb-4 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl border border-neutral-300 bg-neutral-100 text-black">
          <PackageOpen className="h-8 w-8 sm:h-10 sm:w-10 text-neutral-800" />
        </div>
        <h3 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-black">
          No products available
        </h3>
        <p className="mt-2 text-xs sm:text-sm text-neutral-600 max-w-md leading-relaxed">
          {emptyMessage}
        </p>
        <Link
          href="/products"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-black px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-neutral-800 transition-all uppercase tracking-wider"
        >
          <ShoppingBag className="h-4 w-4" />
          <span>Continue Shopping</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.2) }}
            className="h-full"
          >
            <ProductCard product={product} />
          </motion.div>
        ))}
      </div>

      {/* Loading indicator skeletons when fetching next batch */}
      {loading && (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 sm:grid-cols-3 lg:grid-cols-4 pt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Observer target element for infinite scrolling */}
      <div ref={observerTarget} className="h-10 w-full flex items-center justify-center">
        {hasMore && !loading && (
          <button
            onClick={loadMore}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-neutral-300 bg-white text-xs font-bold text-neutral-800 shadow-2xs hover:bg-neutral-50 transition-all uppercase tracking-wider"
          >
            Load More Products
          </button>
        )}
        {loading && (
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-500 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span>Loading more products...</span>
          </div>
        )}
        {!hasMore && products.length > 0 && (
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 py-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>You&apos;ve reached the end of the collection ({products.length} products)</span>
          </div>
        )}
      </div>
    </div>
  );
}
