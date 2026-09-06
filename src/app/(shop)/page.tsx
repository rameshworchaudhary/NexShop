import type { Metadata } from "next";
import HeroBanner from "@/components/home/HeroBanner";
import CategoryBar from "@/components/home/CategoryBar";
import FeatureStrip from "@/components/home/FeatureStrip";
import FlashSaleSection from "@/components/home/FlashSaleSection";
import ProductSection from "@/components/home/ProductSection";
import PromoSection from "@/components/home/PromoSection";
import PopularBrands from "@/components/home/PopularBrands";
import CustomerReviews from "@/components/home/CustomerReviews";
import WhyChooseUs from "@/components/home/WhyChooseUs";
import NepalPaymentBar from "@/components/home/NepalPaymentBar";
import NewsletterSection from "@/components/home/NewsletterSection";
import { getActiveCategories } from "@/lib/firebase/categories";
import { getActiveBannersByPosition } from "@/lib/firebase/banners";
import { getHomepageSections } from "@/lib/firebase/products";
import { SITE_CONFIG } from "@/lib/constants/site";

export const metadata: Metadata = {
  title: `${SITE_CONFIG.name} - ${SITE_CONFIG.tagline}`,
  description: SITE_CONFIG.description,
};

export const revalidate = 3600;

export default async function HomePage() {
  // Fetch all homepage data in parallel
  const [heroBanners, secondaryBanners, categories, productSections] =
    await Promise.allSettled([
      getActiveBannersByPosition("hero"),
      getActiveBannersByPosition("secondary"),
      getActiveCategories(),
      getHomepageSections(12),
    ]);

  const hero = heroBanners.status === "fulfilled" ? heroBanners.value : [];
  const secondary = secondaryBanners.status === "fulfilled" ? secondaryBanners.value : [];
  const cats = categories.status === "fulfilled" ? categories.value : [];
  const sections = productSections.status === "fulfilled" ? productSections.value : { featured: [], trending: [], newArrivals: [] };

  const featured = sections.featured;
  const trending = sections.trending;
  const arrivals = sections.newArrivals;

  return (
    <div className="pb-10 bg-neutral-50 min-h-screen">
      {/* 1. Horizontal Category Navigation Bar */}
      <CategoryBar categories={cats} />

      {/* 2. Hero Section */}
      <HeroBanner banners={hero} />

      {/* 3. Feature Value Proposition Strip */}
      <FeatureStrip />

      {/* 4. Full-width Flash Sale Section */}
      <FlashSaleSection products={featured} />

      {/* 5. Trending in Nepal */}
      {trending.length > 0 && (
        <ProductSection
          title="🔥 Trending in Nepal"
          subtitle="Top picks trending across Kathmandu, Pokhara, Chitwan & beyond"
          products={trending}
          viewAllHref="/products?sortBy=popular"
          badge="Nepal Hot"
        />
      )}

      {/* 6. Secondary Promotional Banners */}
      <PromoSection banners={secondary} />

      {/* 7. Best Sellers in Nepal */}
      {featured.length > 0 && (
        <ProductSection
          title="🏆 Best Sellers in Nepal"
          subtitle="Highest rated products with 100% genuine warranty"
          products={featured}
          viewAllHref="/products?featured=true"
          badge="Top Rated"
        />
      )}

      {/* 8. New Arrivals */}
      {arrivals.length > 0 && (
        <ProductSection
          title="✨ New Arrivals"
          subtitle="Fresh products added to NexShop this week"
          products={arrivals}
          viewAllHref="/products?sortBy=newest"
          badge="New"
        />
      )}

      {/* 9. Popular Brands in Nepal */}
      <PopularBrands />

      {/* 10. Verified Customer Feedback */}
      <CustomerReviews />

      {/* 11. Payment Gateways (eSewa & Khalti Only) */}
      <NepalPaymentBar />

      {/* 12. Why Choose NexShop */}
      <WhyChooseUs />

      {/* 13. Newsletter */}
      <NewsletterSection />
    </div>
  );
}
