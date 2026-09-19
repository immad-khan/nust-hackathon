import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { db, withRetry } from "@/db";
import { categories, products, reviews } from "@/db/schema";
import type { Category, Product, Review } from "@/db/schema";
import { CATEGORY_OPTIONS, productCategories } from "@/lib/categories";

function matchesCategory(slug: string) {
  return or(
    eq(products.categorySlug, slug),
    sql`COALESCE(${products.categorySlugs}, '[]'::jsonb) @> ${JSON.stringify([slug])}::jsonb`,
  );
}

export async function getCategories(): Promise<Category[]> {
  const defaultList: Category[] = CATEGORY_OPTIONS.map((c, i) => ({
    id: i + 1,
    slug: c.slug,
    name: c.name,
    tagline: "",
    imageUrl: "",
    sortOrder: i + 1,
  }));

  if (!db) return defaultList;
  try {
    const rows = await withRetry(() =>
      db!.select().from(categories).orderBy(asc(categories.sortOrder)),
    );
    if (!rows.length) return defaultList;
    const existingSlugs = new Set(rows.map((r) => r.slug));
    const missing = defaultList.filter((d) => !existingSlugs.has(d.slug));
    return [...rows, ...missing];
  } catch {
    return defaultList;
  }
}

export async function getBestSellers(limit = 6): Promise<Product[]> {
  if (!db) return [];
  try {
    const flagged = await withRetry(() =>
      db!
        .select()
        .from(products)
        .where(eq(products.isBestSeller, true))
        .orderBy(desc(products.reviewCount))
        .limit(limit),
    );
    if (flagged.length > 0) return flagged;
    // Fallback: return highest-rated products when no isBestSeller flag is set
    return await withRetry(() =>
      db!
        .select()
        .from(products)
        .orderBy(desc(products.reviewCount), desc(products.rating))
        .limit(limit),
    );
  } catch {
    return [];
  }
}

export async function getNewArrivals(limit = 4): Promise<Product[]> {
  if (!db) return [];
  try {
    const flagged = await withRetry(() =>
      db!
        .select()
        .from(products)
        .where(eq(products.isNew, true))
        .orderBy(desc(products.id))
        .limit(limit),
    );
    if (flagged.length > 0) return flagged;
    // Fallback: return most recently added products when no isNew flag is set
    return await withRetry(() =>
      db!
        .select()
        .from(products)
        .orderBy(desc(products.id))
        .limit(limit),
    );
  } catch {
    return [];
  }
}

export type ShopFilters = {
  category?: string;
  sort?: string;
  q?: string;
  max?: number;
  min?: number;
};

const CATEGORY_ORDER: Record<string, number> = {
  earrings: 1,
  cuffs: 2,
  rings: 3,
  bracelets: 4,
  necklaces: 5,
  sets: 6,
};

export async function getProducts(filters: ShopFilters = {}): Promise<Product[]> {
  if (!db) return [];

  const conditions: (ReturnType<typeof eq> | undefined)[] = [];
  if (filters.category && filters.category !== "all") {
    conditions.push(matchesCategory(filters.category));
  }
  if (filters.q) {
    const term = `%${filters.q}%`;
    conditions.push(
      or(
        ilike(products.name, term),
        ilike(products.shortDescription, term),
        ilike(products.material, term),
      ),
    );
  }
  if (typeof filters.min === "number") conditions.push(gte(products.price, filters.min));
  if (typeof filters.max === "number") conditions.push(lte(products.price, filters.max));
  const validConditions = conditions.filter((c): c is NonNullable<typeof c> => c != null);

  const orderBy = (() => {
    switch (filters.sort) {
      case "price-asc": return asc(products.price);
      case "price-desc": return desc(products.price);
      case "rating": return desc(products.rating);
      case "newest": return desc(products.id);
      default: return desc(products.reviewCount);
    }
  })();

  try {
    let rows = await withRetry(() => {
      const query = db!.select().from(products);
      return validConditions.length > 0
        ? query.where(and(...validConditions)).orderBy(orderBy)
        : query.orderBy(orderBy);
    });

    if (
      (!filters.category || filters.category === "all") &&
      (!filters.sort || filters.sort === "featured")
    ) {
      const getCategoryWeight = (p: Product) => {
        const primary = p.categorySlug;
        if (primary && CATEGORY_ORDER[primary]) return CATEGORY_ORDER[primary];
        const extra = p.categorySlugs?.[0];
        if (extra && CATEGORY_ORDER[extra]) return CATEGORY_ORDER[extra];
        return 99;
      };

      rows = [...rows].sort((a, b) => {
        const weightA = getCategoryWeight(a);
        const weightB = getCategoryWeight(b);
        if (weightA !== weightB) return weightA - weightB;
        return b.reviewCount - a.reviewCount;
      });
    }

    return rows;
  } catch {
    return [];
  }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (!db) return null;
  try {
    const rows = await withRetry(() =>
      db!.select().from(products).where(eq(products.slug, slug)).limit(1),
    );
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function getProductsBySlugs(slugs: string[]): Promise<Product[]> {
  if (slugs.length === 0 || !db) return [];
  try {
    return await withRetry(() =>
      db!.select().from(products).where(inArray(products.slug, slugs)),
    );
  } catch {
    return [];
  }
}

export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  if (!db) return [];
  const cats = productCategories(product);
  try {
    const categoryMatch =
      cats.length === 1
        ? matchesCategory(cats[0])
        : or(...cats.map((slug) => matchesCategory(slug)));

    return await withRetry(() =>
      db!
        .select()
        .from(products)
        .where(and(categoryMatch, sql`${products.slug} <> ${product.slug}`))
        .limit(limit),
    );
  } catch {
    return [];
  }
}

export async function getReviews(slug: string): Promise<Review[]> {
  if (!db) return [];
  try {
    return await withRetry(() =>
      db!
        .select()
        .from(reviews)
        .where(eq(reviews.productSlug, slug))
        .orderBy(desc(reviews.createdAt)),
    );
  } catch {
    return [];
  }
}

export async function getAllProductSlugs(): Promise<string[]> {
  if (!db) return [];
  try {
    const rows = await withRetry(() =>
      db!.select({ slug: products.slug }).from(products),
    );
    return rows.map((row) => row.slug);
  } catch {
    return [];
  }
}