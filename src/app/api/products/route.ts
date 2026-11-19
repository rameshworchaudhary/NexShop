import { NextRequest, NextResponse } from "next/server";
import { getProducts } from "@/lib/firebase/products";
import type { ProductFilters } from "@/lib/types/product";

// The infinite-scroll client requests 20 products per page. Keep the API cap in
// sync with that caller while allowing substantial catalog depth (20,000 rows).
const MAX_PAGE_SIZE = 20;
const MAX_PAGE = 1_000;

function parsePositiveInteger(
  value: string | null,
  defaultValue: number,
  maximum: number
): number | null {
  if (value === null) return defaultValue;
  if (!/^\d+$/.test(value)) return null;

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) return null;
  return parsed;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    const page = parsePositiveInteger(searchParams.get("page"), 1, MAX_PAGE);
    const pageSize = parsePositiveInteger(searchParams.get("pageSize"), 20, MAX_PAGE_SIZE);
    if (page === null || pageSize === null) {
      return NextResponse.json(
        { error: `page must be an integer from 1 to ${MAX_PAGE}; pageSize must be an integer from 1 to ${MAX_PAGE_SIZE}` },
        { status: 400 }
      );
    }
    
    const categoryId = searchParams.get("categoryId") || undefined;
    const subCategoryId = searchParams.get("subCategoryId") || undefined;
    const minPrice = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined;
    const maxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined;
    const rating = searchParams.get("rating") ? Number(searchParams.get("rating")) : undefined;
    const sortBy = (searchParams.get("sortBy") as ProductFilters["sortBy"]) || "newest";
    const search = searchParams.get("q") || searchParams.get("search") || undefined;
    const inStock = searchParams.get("inStock") === "true";
    
    const brandParam = searchParams.get("brand");
    const brand = brandParam ? brandParam.split(",").filter(Boolean) : undefined;

    const filters: ProductFilters = {
      categoryId,
      subCategoryId,
      minPrice,
      maxPrice,
      rating,
      sortBy,
      search,
      inStock,
      brand,
    };

    const { products, total, hasMore } = await getProducts(filters, pageSize, page);

    // Strip out heavy descriptions/specs to keep API payload ultra-light
    const leanProducts = products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      shortDescription: p.shortDescription,
      price: p.price,
      comparePrice: p.comparePrice,
      discountPercentage: p.discountPercentage,
      thumbnailImage: p.thumbnailImage,
      rating: p.rating,
      reviewCount: p.reviewCount,
      stock: p.stock,
      unit: p.unit,
      categoryId: p.categoryId,
      categoryName: p.categoryName,
      brand: p.brand,
      isFeatured: p.isFeatured,
      isBestSeller: p.isBestSeller,
      isTrending: p.isTrending,
      freeDelivery: p.freeDelivery,
      sellerName: p.sellerName,
    }));

    return NextResponse.json(
      {
        products: leanProducts,
        total,
        page,
        hasMore,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    console.error("Error in GET /api/products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
