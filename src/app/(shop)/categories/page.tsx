import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getActiveCategories } from "@/lib/firebase/categories";

export const metadata: Metadata = {
  title: "All Categories",
  description: "Browse all product categories on NexShop",
};

export const revalidate = 3600;

export default async function CategoriesPage() {
  const categories = await getActiveCategories();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">All Categories</h1>
        <p className="text-muted-foreground mt-1">
          Discover products across {categories.length} categories
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/categories/${category.slug}`}
            className="group flex flex-col items-center gap-3 p-5 rounded-xl border bg-card hover:border-primary hover:shadow-md transition-all duration-200"
          >
            <div className="relative h-20 w-20 rounded-full overflow-hidden bg-muted flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              {category.image ? (
                <Image
                  src={category.image}
                  alt={category.name}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              ) : (
                <span className="text-4xl">{category.icon || "🛍️"}</span>
              )}
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm group-hover:text-primary transition-colors">
                {category.name}
              </p>
              {category.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {category.description}
                </p>
              )}
              {category.productCount > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {category.productCount} products
                </p>
              )}
            </div>

            {/* Subcategories preview */}
            {category.subCategories && category.subCategories.length > 0 && (
              <div className="flex flex-wrap gap-1 justify-center">
                {category.subCategories.slice(0, 3).map((sub) => (
                  <span
                    key={sub.id}
                    className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground"
                  >
                    {sub.name}
                  </span>
                ))}
                {category.subCategories.length > 3 && (
                  <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                    +{category.subCategories.length - 3}
                  </span>
                )}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
