import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, cache } from "react";
import { getProductBySlug, getSimilarProducts } from "@/lib/firebase/products";
import { getReviewsByProduct, computeReviewSummary } from "@/lib/firebase/reviews";
import ProductDetailClient from "@/components/product/ProductDetailClient";
import ProductSection from "@/components/home/ProductSection";
import ProductCardSkeleton from "@/components/product/ProductCardSkeleton";
import type { Product } from "@/lib/types/product";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

// React cache deduplicates call across generateMetadata and ProductPage in the same request
const getCachedProductBySlug = cache(async (slug: string) => {
  return await getProductBySlug(slug);
});

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getCachedProductBySlug(slug);
  if (!product) return { title: "Product Not Found" };
  return {
    title: `${product.name} - NexShop`,
    description: product.shortDescription || product.description?.slice(0, 160),
    openGraph: {
      title: product.name,
      description: product.shortDescription,
      images: [{ url: product.thumbnailImage }],
    },
  };
}

export const revalidate = 3600;
export const dynamicParams = true;

async function SimilarProductsSection({ product }: { product: Product }) {
  const similar = await getSimilarProducts(product, 8);
  if (!similar || similar.length === 0) return null;
  return (
    <ProductSection
      title="Similar Products"
      subtitle="You might also like these"
      products={similar}
      viewAllHref={`/categories/${product.categoryId}`}
    />
  );
}

function SimilarProductsFallback() {
  return (
    <section className="max-w-[1400px] mx-auto px-3 sm:px-6 my-4 sm:my-6">
      <div className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5">
        <div className="h-6 w-48 bg-slate-200 rounded-md animate-pulse mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getCachedProductBySlug(slug);
  if (!product) notFound();

  const reviews = await getReviewsByProduct(product.id);
  const reviewSummary = computeReviewSummary(reviews);

  return (
    <div className="pb-16">
      <ProductDetailClient
        product={product}
        reviews={reviews}
        reviewSummary={reviewSummary}
      />
      <Suspense fallback={<SimilarProductsFallback />}>
        <SimilarProductsSection product={product} />
      </Suspense>
    </div>
  );
}
