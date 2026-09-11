import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import ProductGridInfinite from "@/components/product/ProductGridInfinite";
import ProductGrid from "@/components/product/ProductGrid";
import ProductFilters from "@/components/product/ProductFilters";
import { getProducts } from "@/lib/firebase/products";
import { getActiveCategories } from "@/lib/firebase/categories";
import type { ProductFilters as FiltersType } from "@/lib/types/product";

export const metadata: Metadata = {
  title: "All Products",
  description: "Browse all products on NexShop",
};

export const revalidate = 3600;

interface ProductsPageProps {
  searchParams: Promise<{
    categoryId?: string;
    subCategoryId?: string;
    brand?: string | string[];
    minPrice?: string;
    maxPrice?: string;
    rating?: string;
    sortBy?: string;
    search?: string;
    inStock?: string;
    q?: string;
    page?: string;
  }>;
}

const SORT_OPTIONS = [
  { label: "Newest First", value: "newest" },
  { label: "Price: Low to High", value: "price-asc" },
  { label: "Price: High to Low", value: "price-desc" },
  { label: "Top Rated", value: "rating" },
  { label: "Most Popular", value: "popular" },
];

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;

  const filters: FiltersType = {
    categoryId: params.categoryId,
    subCategoryId: params.subCategoryId,
    brand: params.brand ? (Array.isArray(params.brand) ? params.brand : [params.brand]) : undefined,
    minPrice: params.minPrice ? Number(params.minPrice) : undefined,
    maxPrice: params.maxPrice ? Number(params.maxPrice) : undefined,
    rating: params.rating ? Number(params.rating) : undefined,
    sortBy: (params.sortBy as FiltersType["sortBy"]) || "newest",
    search: params.q || params.search,
    inStock: params.inStock === "true",
  };

  const [{ products, total, hasMore }, categories] = await Promise.all([
    getProducts(filters, 20, 1),
    getActiveCategories(),
  ]);

  // Extract unique brands from initial results for filter
  const brands = [...new Set(products.map((p) => p.brand).filter(Boolean) as string[])].sort();
  const maxPrice = Math.max(...products.map((p) => p.comparePrice || p.price || 0), 50000);

  const currentSort = params.sortBy || "newest";

  return (
    <div className="container mx-auto px-3.5 py-6 sm:px-6 sm:py-10 lg:py-14">
      {/* Page header */}
      <div className="mb-6 sm:mb-8 border-b border-[#e5ded3] pb-5 sm:pb-7">
        <p className="mb-1 sm:mb-2 text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8b6b35]">The collection</p>
        <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl tracking-wide text-[#292722]">
          {params.q ? `Search results for "${params.q}"` : "All Products"}
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-[#777166]">
          {total} {total === 1 ? "product" : "products"} available
        </p>
      </div>

      <div className="flex gap-8">
        {/* Sidebar filters - desktop */}
        <aside className="hidden w-64 flex-shrink-0 lg:block">
          <div className="sticky top-24 rounded-xl border border-[#ded6ca] bg-[#f8f5ef] p-5">
            <ProductFilters
              categories={categories}
              brands={brands}
              maxPrice={maxPrice}
            />
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Sort bar */}
          <div className="mb-5 sm:mb-6 flex flex-col items-start justify-between gap-3 rounded-xl border border-[#ded6ca] bg-[#f8f5ef] p-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#777166]">
              <SlidersHorizontal className="h-4 w-4" />
              <span>Sort collection</span>
            </div>
            <div className="flex w-full sm:w-auto gap-2 overflow-x-auto scrollbar-hide py-1">
              {SORT_OPTIONS.map((opt) => (
                <Link
                  key={opt.value}
                  href={`?${new URLSearchParams({ ...Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]), sortBy: opt.value }).toString()}`}
                  className={`whitespace-nowrap min-h-[36px] flex items-center rounded-full border px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors ${
                    currentSort === opt.value
                      ? "border-[#292722] bg-[#292722] text-[#f8f5ef]"
                      : "border-[#d8d0c4] text-[#777166] hover:border-[#b99558] hover:text-[#8b6b35]"
                  }`}
                >
                  {opt.label}
                </Link>
              ))}
            </div>
          </div>

          <Suspense fallback={<ProductGrid products={[]} loading={true} />}>
            <ProductGridInfinite
              initialProducts={products}
              initialHasMore={hasMore}
              initialTotal={total}
              filters={filters}
              emptyMessage={
                params.q
                  ? `No products found for "${params.q}"`
                  : "No products match your filters"
              }
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
