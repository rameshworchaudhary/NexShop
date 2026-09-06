import { cache } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as fbLimit,
  startAfter,
  serverTimestamp,
  increment,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { db } from "./config";
import { COLLECTIONS } from "./collections";
import type { Product, ProductFormInput, ProductFilters } from "@/lib/types/product";

function mapProductDoc(docSnap: QueryDocumentSnapshot<DocumentData> | DocumentData): Product {
  const data = typeof (docSnap as QueryDocumentSnapshot<DocumentData>).data === "function" 
    ? (docSnap as QueryDocumentSnapshot<DocumentData>).data() 
    : (docSnap as DocumentData);
  const id = docSnap.id || data.id || "";

  const createdAtStr =
  data.createdAt?.toDate?.()?.toISOString() ||
  (typeof data.createdAt === "string" ? data.createdAt : "") ||
  "";

  const updatedAtStr =
  data.updatedAt?.toDate?.()?.toISOString() ||
  (typeof data.updatedAt === "string" ? data.updatedAt : "") ||
  createdAtStr;

  return {
    id,
    ...data,
    createdAt: createdAtStr,
    updatedAt: updatedAtStr,
  } as Product;
}

let activeProductsCache: { data: Product[]; timestamp: number } | null = null;
const PRODUCT_CACHE_TTL = 60000; // 60 seconds TTL

// Section-level caches to avoid repeating homepage queries within TTL
let homepageSectionsCache: {
  data: { featured: Product[]; trending: Product[]; newArrivals: Product[] };
  timestamp: number;
} | null = null;

export function clearProductCache() {
  activeProductsCache = null;
  homepageSectionsCache = null;
}

export const getProductById = cache(async function getProductById(id: string): Promise<Product | null> {
  if (!id) return null;
  try {
    const ref = doc(db, COLLECTIONS.PRODUCTS, id);
    const snap = await getDoc(ref);
    if (snap.exists()) return mapProductDoc(snap);

    // Fallback if id was actually a slug
    const q = query(
      collection(db, COLLECTIONS.PRODUCTS),
      where("slug", "==", id),
      fbLimit(1)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) return mapProductDoc(snapshot.docs[0]);

    return null;
  } catch (err) {
    console.error("Error fetching product by id:", err);
    return null;
  }
});

export const getProductBySlug = cache(async function getProductBySlug(rawSlug: string): Promise<Product | null> {
  if (!rawSlug) return null;
  const decodedSlug = decodeURIComponent(rawSlug).trim();

  try {
    // 1. Direct Firestore query by slug (LIMIT 1) - fast, single read
    const q = query(
      collection(db, COLLECTIONS.PRODUCTS),
      where("slug", "==", decodedSlug),
      fbLimit(1)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) return mapProductDoc(snapshot.docs[0]);

    // 2. Query with rawSlug if different
    if (rawSlug !== decodedSlug) {
      const qRaw = query(
        collection(db, COLLECTIONS.PRODUCTS),
        where("slug", "==", rawSlug),
        fbLimit(1)
      );
      const snapRaw = await getDocs(qRaw);
      if (!snapRaw.empty) return mapProductDoc(snapRaw.docs[0]);
    }

    // 3. Document ID direct check (1 read)
    const ref = doc(db, COLLECTIONS.PRODUCTS, decodedSlug);
    const snap = await getDoc(ref);
    if (snap.exists()) return mapProductDoc(snap);

    if (rawSlug !== decodedSlug) {
      const refRaw = doc(db, COLLECTIONS.PRODUCTS, rawSlug);
      const snapRaw = await getDoc(refRaw);
      if (snapRaw.exists()) return mapProductDoc(snapRaw);
    }

    // 4. Case-insensitive slug query fallback
    const lowerSlug = decodedSlug.toLowerCase();
    if (lowerSlug !== decodedSlug) {
      const qLower = query(
        collection(db, COLLECTIONS.PRODUCTS),
        where("slug", "==", lowerSlug),
        fbLimit(1)
      );
      const snapLower = await getDocs(qLower);
      if (!snapLower.empty) return mapProductDoc(snapLower.docs[0]);
    }

    return null;
  } catch (err) {
    console.error("Error fetching product by slug:", err);
    return null;
  }
});

export function isProductInCategory(product: Product, categoryIdOrSlug?: string, subCategoryId?: string): boolean {
  if (!product) return false;
  if (!categoryIdOrSlug && !subCategoryId) return true;

  // 1. If explicit subCategoryId filter passed, check subCategoryId exact match
  if (subCategoryId) {
    if (product.subCategoryId === subCategoryId) return true;
    if (product.subCategoryName?.toLowerCase().replace(/\s+/g, "-") === subCategoryId.toLowerCase()) return true;
    return false;
  }

  const cleanId = (categoryIdOrSlug || "").toLowerCase().replace("virtual_", "").trim();

  // 2. Direct Firestore ID matches
  if (product.categoryId === categoryIdOrSlug || product.categoryId === cleanId) {
    return true;
  }
  if (product.subCategoryId === categoryIdOrSlug || product.subCategoryId === cleanId) {
    return true;
  }

  // 3. Category / Subcategory Name / Slug matching rules
  const catName = (product.categoryName || "").toLowerCase();
  const subCatName = (product.subCategoryName || "").toLowerCase();
  const prodName = (product.name || "").toLowerCase();

  switch (cleanId) {
    case "mobiles":
    case "smartphones":
    case "mobile-phones":
    case "sub_phones":
      return (
        product.subCategoryId === "sub_phones" ||
        catName === "mobiles" ||
        catName === "mobile phones" ||
        catName === "smartphones" ||
        subCatName.includes("mobile") ||
        subCatName.includes("smartphone") ||
        subCatName.includes("phone") ||
        prodName.includes("smartphone") ||
        (prodName.includes("mobile") && !prodName.includes("oil") && !prodName.includes("cream"))
      );

    case "electronics":
    case "tech":
      return (
        product.categoryId === "FHVoBenxn5sglbQ1FlkM" ||
        catName.includes("electronic") ||
        catName.includes("tech")
      );

    case "fashion":
    case "apparel":
    case "clothing":
      return (
        product.categoryId === "V1igsyVaIxZcb9YLsaV5" ||
        catName.includes("fashion") ||
        catName.includes("apparel") ||
        catName.includes("clothing")
      );

    case "beauty":
    case "beauty-personal-care":
    case "personal-care":
      return (
        product.categoryId === "dvelBiuo3SFWtklxyWQy" ||
        catName.includes("beauty") ||
        catName.includes("personal care")
      );

    case "home":
    case "home-kitchen":
    case "home-living":
    case "home-decor":
      return (
        product.categoryId === "cefuDmHyonTWwSo0LVHm" ||
        catName.includes("home")
      );

    case "appliances":
    case "home-appliances":
      return (
        catName.includes("appliance") ||
        subCatName.includes("appliance")
      );

    case "kitchen":
    case "kitchenware":
    case "sub_kitchenware":
      return (
        product.subCategoryId === "sub_kitchenware" ||
        catName.includes("kitchen") ||
        subCatName.includes("kitchen")
      );

    case "sports":
    case "sports-outdoors":
    case "sports-fitness":
      return (
        product.categoryId === "B125wGTulQOVMtSVwHdw" ||
        catName.includes("sport")
      );

    case "furniture":
    case "sub_furniture":
      return (
        product.subCategoryId === "sub_furniture" ||
        catName.includes("furniture") ||
        subCatName.includes("furniture")
      );

    case "books":
    case "books-stationery":
      return (
        catName.includes("book") ||
        subCatName.includes("book")
      );

    case "grocery":
    case "groceries":
    case "supermarket":
      return (
        product.categoryId === "YkM5ZYepThTIxQG3bKCr" ||
        catName.includes("grocer")
      );

    case "2-wheelers":
    case "two-wheelers":
    case "bikes":
    case "automotive":
      return (
        catName.includes("2 wheeler") ||
        catName.includes("two wheeler") ||
        catName.includes("bike") ||
        catName.includes("automotive")
      );

    default:
      return catName === cleanId || subCatName === cleanId;
  }
}

export async function getProducts(
  filters: ProductFilters = {},
  pageSize = 24,
  page = 1
): Promise<{
  products: Product[];
  total: number;
  page: number;
  hasMore: boolean;
  lastDoc?: any;
}> {
  let matchedProducts: Product[] = [];

  try {
    if (filters.categoryId && !filters.search) {
      // 1. Category-specific targeted query
      const catQuery = query(
        collection(db, COLLECTIONS.PRODUCTS),
        where("categoryId", "==", filters.categoryId),
        fbLimit(Math.max(pageSize * page + 20, 60))
      );
      const snap = await getDocs(catQuery);
      let docs = snap.docs.map(mapProductDoc).filter((p) => p.isActive !== false);

      // If category alias or subcategory fallback is needed
      if (docs.length === 0) {
        const activeSnap = await getDocs(
          query(collection(db, COLLECTIONS.PRODUCTS), where("isActive", "==", true), fbLimit(100))
        );
        docs = activeSnap.docs.map(mapProductDoc);
      }

      matchedProducts = docs.filter((p) =>
        isProductInCategory(p, filters.categoryId, filters.subCategoryId)
      );
    } else if (filters.search) {
      // 2. Search query bounded to active items
      const searchSnap = await getDocs(
        query(collection(db, COLLECTIONS.PRODUCTS), where("isActive", "==", true), fbLimit(200))
      );
      const allActive = searchSnap.docs.map(mapProductDoc);

      const searchLower = filters.search.toLowerCase().trim();
      const searchWords = searchLower.split(/\s+/).filter((w) => w.length > 1);

      matchedProducts = allActive.filter((p) => {
        const pName = p.name.toLowerCase();
        const pDesc = (p.description || "").toLowerCase();
        const pBrand = (p.brand || "").toLowerCase();
        const pCategory = (p.categoryName || "").toLowerCase();
        const pSubCategory = (p.subCategoryName || "").toLowerCase();
        const pTags = (p.tags || []).map((t) => t.toLowerCase());

        if (
          pName.includes(searchLower) ||
          pDesc.includes(searchLower) ||
          pBrand.includes(searchLower) ||
          pCategory.includes(searchLower) ||
          pSubCategory.includes(searchLower) ||
          pTags.some((tag) => tag.includes(searchLower))
        ) {
          return true;
        }

        return searchWords.some(
          (word) =>
            pName.includes(word) ||
            pDesc.includes(word) ||
            pBrand.includes(word) ||
            pCategory.includes(word) ||
            pSubCategory.includes(word) ||
            pTags.some((tag) => tag.includes(word))
        );
      });
    } else {
      // 3. General browsing query (bounded to requested page size)
      const fetchLimit = Math.max(pageSize * page + 20, 60);
      const activeSnap = await getDocs(
        query(collection(db, COLLECTIONS.PRODUCTS), where("isActive", "==", true), fbLimit(fetchLimit))
      );
      matchedProducts = activeSnap.docs.map(mapProductDoc);
    }
  } catch (err) {
    console.error("Error executing getProducts query:", err);
    matchedProducts = [];
  }

  // 1. Strict Category & Subcategory Filter (if not already handled)
  if (filters.categoryId || filters.subCategoryId) {
    matchedProducts = matchedProducts.filter((p) =>
      isProductInCategory(p, filters.categoryId, filters.subCategoryId)
    );
  }

  // 2. Price Filters
  if (filters.minPrice !== undefined) {
    matchedProducts = matchedProducts.filter((p) => p.price >= filters.minPrice!);
  }
  if (filters.maxPrice !== undefined) {
    matchedProducts = matchedProducts.filter((p) => p.price <= filters.maxPrice!);
  }

  // 3. Brand Filter
  if (filters.brand && filters.brand.length > 0) {
    matchedProducts = matchedProducts.filter((p) => p.brand && filters.brand!.includes(p.brand));
  }

  // 4. Rating Filter
  if (filters.rating !== undefined) {
    matchedProducts = matchedProducts.filter((p) => (p.rating || 0) >= filters.rating!);
  }

  // 5. In-Stock Filter
  if (filters.inStock) {
    matchedProducts = matchedProducts.filter((p) => p.stock > 0);
  }

  // 6. Sorting
  switch (filters.sortBy) {
    case "price-asc":
      matchedProducts.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      matchedProducts.sort((a, b) => b.price - a.price);
      break;
    case "rating":
      matchedProducts.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      break;
    case "popular":
      matchedProducts.sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0));
      break;
    case "newest":
    default:
      matchedProducts.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.updatedAt || 0).getTime();
        const dateB = new Date(b.createdAt || b.updatedAt || 0).getTime();
        return dateB - dateA;
      });
      break;
  }

  const total = matchedProducts.length;
  const startIndex = (page - 1) * pageSize;
  const paginatedProducts = matchedProducts.slice(startIndex, startIndex + pageSize);
  const hasMore = startIndex + pageSize < total;

  return {
    products: paginatedProducts,
    total,
    page,
    hasMore,
  };
}

export const getAllActiveProducts = cache(async function getAllActiveProducts(): Promise<Product[]> {
  if (
    activeProductsCache &&
    Date.now() - activeProductsCache.timestamp < PRODUCT_CACHE_TTL
  ) {
    return activeProductsCache.data;
  }

  try {
    const q = query(
      collection(db, COLLECTIONS.PRODUCTS),
      where("isActive", "==", true),
      fbLimit(150)
    );
    const snapshot = await getDocs(q);
    const result = snapshot.docs
      .map(mapProductDoc)
      .filter((p) => p.isActive && (p.status === "active" || !p.status));
    activeProductsCache = { data: result, timestamp: Date.now() };
    return result;
  } catch (err) {
    console.error("Error fetching active products:", err);
    return activeProductsCache ? activeProductsCache.data : [];
  }
});

export const getHomepageSections = cache(async function getHomepageSections(count = 12): Promise<{
  featured: Product[];
  trending: Product[];
  newArrivals: Product[];
}> {
  if (
    homepageSectionsCache &&
    Date.now() - homepageSectionsCache.timestamp < PRODUCT_CACHE_TTL
  ) {
    return homepageSectionsCache.data;
  }

  try {
    // 1. Fetch Featured & Best Sellers in parallel with limit
    const [featuredSnap, trendingSnap, activeSnap] = await Promise.all([
      getDocs(
        query(
          collection(db, COLLECTIONS.PRODUCTS),
          where("isActive", "==", true),
          where("isFeatured", "==", true),
          fbLimit(count)
        )
      ).catch(() => null),
      getDocs(
        query(
          collection(db, COLLECTIONS.PRODUCTS),
          where("isActive", "==", true),
          where("isTrending", "==", true),
          fbLimit(count)
        )
      ).catch(() => null),
      getDocs(
        query(
          collection(db, COLLECTIONS.PRODUCTS),
          where("isActive", "==", true),
          fbLimit(count * 3)
        )
      ).catch(() => null),
    ]);

    const activePool = activeSnap ? activeSnap.docs.map(mapProductDoc) : [];

    // Featured list
    let featured: Product[] = featuredSnap ? featuredSnap.docs.map(mapProductDoc) : [];
    if (featured.length < count) {
      const bestSellers = activePool.filter((p) => p.isBestSeller || p.isFeatured);
      const combined = [...featured, ...bestSellers];
      const unique = Array.from(new Map(combined.map((p) => [p.id, p])).values());
      featured = unique.length > 0 ? unique.slice(0, count) : activePool.slice(0, count);
    }

    // Trending list
    let trending: Product[] = trendingSnap ? trendingSnap.docs.map(mapProductDoc) : [];
    if (trending.length < count) {
      const trendingInPool = activePool.filter((p) => p.isTrending);
      const combined = [...trending, ...trendingInPool];
      const unique = Array.from(new Map(combined.map((p) => [p.id, p])).values());
      trending = unique.length > 0 ? unique.slice(0, count) : activePool.slice(0, count);
    }

    // New Arrivals list
    const newArrivals = [...activePool]
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || a.updatedAt || 0).getTime();
        const dateB = new Date(b.createdAt || b.updatedAt || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, count);

    const result = { featured, trending, newArrivals };
    homepageSectionsCache = { data: result, timestamp: Date.now() };
    return result;
  } catch (err) {
    console.error("Error fetching homepage product sections:", err);
    return { featured: [], trending: [], newArrivals: [] };
  }
});

export async function getFeaturedProducts(count = 16, activeProducts?: Product[]): Promise<Product[]> {
  try {
    if (activeProducts && activeProducts.length > 0) {
      const sorted = [...activeProducts].sort((a, b) => {
        const aBestSeller = !!(a.isBestSeller || a.isFeatured);
        const bBestSeller = !!(b.isBestSeller || b.isFeatured);
        if (aBestSeller && !bBestSeller) return -1;
        if (!aBestSeller && bBestSeller) return 1;
        const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return dateB - dateA;
      });
      return sorted.slice(0, count);
    }

    const snap = await getDocs(
      query(
        collection(db, COLLECTIONS.PRODUCTS),
        where("isActive", "==", true),
        where("isFeatured", "==", true),
        fbLimit(count)
      )
    );
    const featured = snap.docs.map(mapProductDoc);
    if (featured.length >= count) return featured;

    // Supplement with active products up to count
    const activeSnap = await getDocs(
      query(collection(db, COLLECTIONS.PRODUCTS), where("isActive", "==", true), fbLimit(count))
    );
    const pool = activeSnap.docs.map(mapProductDoc);
    const combined = [...featured, ...pool];
    const unique = Array.from(new Map(combined.map((p) => [p.id, p])).values());
    return unique.slice(0, count);
  } catch (err) {
    console.error("Error fetching featured/best-seller products:", err);
    return [];
  }
}

export async function getTrendingProducts(count = 16, activeProducts?: Product[]): Promise<Product[]> {
  try {
    if (activeProducts && activeProducts.length > 0) {
      const sorted = [...activeProducts].sort((a, b) => {
        const aTrending = !!a.isTrending;
        const bTrending = !!b.isTrending;
        if (aTrending && !bTrending) return -1;
        if (!aTrending && bTrending) return 1;
        const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return dateB - dateA;
      });
      return sorted.slice(0, count);
    }

    const snap = await getDocs(
      query(
        collection(db, COLLECTIONS.PRODUCTS),
        where("isActive", "==", true),
        where("isTrending", "==", true),
        fbLimit(count)
      )
    );
    const trending = snap.docs.map(mapProductDoc);
    if (trending.length >= count) return trending;

    const activeSnap = await getDocs(
      query(collection(db, COLLECTIONS.PRODUCTS), where("isActive", "==", true), fbLimit(count))
    );
    const pool = activeSnap.docs.map(mapProductDoc);
    const combined = [...trending, ...pool];
    const unique = Array.from(new Map(combined.map((p) => [p.id, p])).values());
    return unique.slice(0, count);
  } catch (err) {
    console.error("Error fetching trending products:", err);
    return [];
  }
}

export const getSimilarProducts = cache(async function getSimilarProducts(product: Product, count = 8): Promise<Product[]> {
  try {
    if (!product?.categoryId) return [];
    // Single-field query by categoryId (requires no composite index)
    const q = query(
      collection(db, COLLECTIONS.PRODUCTS),
      where("categoryId", "==", product.categoryId),
      fbLimit(count + 5)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const docs = snapshot.docs
        .map(mapProductDoc)
        .filter((p) => p.isActive !== false && p.id !== product.id);
      if (docs.length > 0) {
        return docs.slice(0, count);
      }
    }

    // Fallback bounded query
    const activeSnap = await getDocs(
      query(collection(db, COLLECTIONS.PRODUCTS), where("isActive", "==", true), fbLimit(count + 10))
    );
    const activeDocs = activeSnap.docs.map(mapProductDoc);
    return activeDocs
      .filter((p) => isProductInCategory(p, product.categoryId) && p.id !== product.id)
      .slice(0, count);
  } catch (err) {
    console.error("Error fetching similar products:", err);
    return [];
  }
});

export async function getNewArrivals(count = 12, activeProducts?: Product[]): Promise<Product[]> {
  try {
    if (activeProducts && activeProducts.length > 0) {
      const sorted = [...activeProducts].sort((a, b) => {
        const dateA = new Date(a.createdAt || a.updatedAt || 0).getTime();
        const dateB = new Date(b.createdAt || b.updatedAt || 0).getTime();
        return dateB - dateA;
      });
      return sorted.slice(0, count);
    }

    const activeSnap = await getDocs(
      query(collection(db, COLLECTIONS.PRODUCTS), where("isActive", "==", true), fbLimit(Math.min(count, 50)))
    );
    const pool = activeSnap.docs.map(mapProductDoc);
    const sorted = pool.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const dateB = new Date(b.createdAt || b.updatedAt || 0).getTime();
      return dateB - dateA;
    });
    return sorted.slice(0, count);
  } catch (err) {
    console.error("Error fetching new arrivals:", err);
    return [];
  }
}

export async function getLowStockProducts(limitCount = 50): Promise<Product[]> {
  try {
    const snapshot = await getDocs(
      query(collection(db, COLLECTIONS.PRODUCTS), where("isActive", "==", true), fbLimit(150))
    );
    return snapshot.docs
      .map(mapProductDoc)
      .filter((p) => p.stock <= p.lowStockThreshold && p.stock >= 0)
      .slice(0, limitCount);
  } catch (err) {
    console.error("Error fetching low stock products:", err);
    return [];
  }
}

export async function getProductsBySeller(sellerId: string): Promise<Product[]> {
  if (!sellerId) return [];
  try {
    const q = query(
      collection(db, COLLECTIONS.PRODUCTS),
      where("sellerId", "==", sellerId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(mapProductDoc);
  } catch (err) {
    console.error("Error fetching products by seller:", err);
    return [];
  }
}

export async function getAllProductsForAdmin(): Promise<Product[]> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTIONS.PRODUCTS), orderBy("createdAt", "desc"))
  );
  return snapshot.docs.map(mapProductDoc);
}

function removeUndefinedFields<T extends Record<string, any>>(obj: T): T {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as T;
}

export async function createProduct(input: ProductFormInput): Promise<string> {
  clearProductCache();
  let sellerName = input.sellerName;

  if (input.sellerId && !sellerName) {
    try {
      const sellerSnap = await getDoc(doc(db, COLLECTIONS.USERS, input.sellerId));
      if (sellerSnap.exists()) {
        const sData = sellerSnap.data();
        sellerName = sData?.sellerProfile?.shopName || sData?.displayName || "Store";
      }
    } catch (e) {
      console.warn("Could not fetch seller name:", e);
    }
  }

  const rawPayload = {
    ...input,
    ...(sellerName ? { sellerName } : {}),
    rating: 0,
    reviewCount: 0,
    soldCount: 0,
    viewCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const payload = removeUndefinedFields(rawPayload);

  const docRef = await addDoc(collection(db, COLLECTIONS.PRODUCTS), payload);

  if (input.sellerId) {
    try {
      const sellerRef = doc(db, COLLECTIONS.USERS, input.sellerId);
      const sellerSnap = await getDoc(sellerRef);
      if (sellerSnap.exists()) {
        const sData = sellerSnap.data();
        if (sData?.sellerProfile) {
          await updateDoc(sellerRef, {
            "sellerProfile.totalProducts": increment(1),
            updatedAt: serverTimestamp(),
          });
        }
      }
    } catch (err) {
      console.warn("Error updating seller totalProducts in createProduct:", err);
    }
  }

  return docRef.id;
}

export async function updateProduct(id: string, input: Partial<ProductFormInput>): Promise<void> {
  clearProductCache();
  const ref = doc(db, COLLECTIONS.PRODUCTS, id);
  const oldSnap = await getDoc(ref);
  const oldSellerId = oldSnap.exists() ? oldSnap.data()?.sellerId : undefined;

  const payload = removeUndefinedFields({
    ...input,
    updatedAt: serverTimestamp(),
  });

  await updateDoc(ref, payload);

  const newSellerId = input.sellerId;
  if (newSellerId !== undefined && oldSellerId !== newSellerId) {
    if (oldSellerId) {
      try {
        await updateDoc(doc(db, COLLECTIONS.USERS, oldSellerId), {
          "sellerProfile.totalProducts": increment(-1),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn("Error decrementing old seller totalProducts:", err);
      }
    }
    if (newSellerId) {
      try {
        await updateDoc(doc(db, COLLECTIONS.USERS, newSellerId), {
          "sellerProfile.totalProducts": increment(1),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn("Error incrementing new seller totalProducts:", err);
      }
    }
  }
}

export async function deleteProduct(id: string): Promise<void> {
  clearProductCache();
  const ref = doc(db, COLLECTIONS.PRODUCTS, id);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    if (data.sellerId) {
      try {
        await updateDoc(doc(db, COLLECTIONS.USERS, data.sellerId), {
          "sellerProfile.totalProducts": increment(-1),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn("Error decrementing seller totalProducts on delete:", err);
      }
    }
  }
  await deleteDoc(ref);
}

export async function incrementProductViewCount(id: string): Promise<void> {
  const ref = doc(db, COLLECTIONS.PRODUCTS, id);
  await updateDoc(ref, { viewCount: increment(1) });
}

export async function decrementStockAndIncrementSold(id: string, quantity: number): Promise<void> {
  const ref = doc(db, COLLECTIONS.PRODUCTS, id);
  await updateDoc(ref, {
    stock: increment(-quantity),
    soldCount: increment(quantity),
  });
}

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];

  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 30) {
    chunks.push(ids.slice(i, i + 30));
  }

  const results: Product[] = [];
  for (const chunk of chunks) {
    const q = query(collection(db, COLLECTIONS.PRODUCTS), where("__name__", "in", chunk));
    const snapshot = await getDocs(q);
    results.push(...snapshot.docs.map(mapProductDoc));
  }

  return results;
}
