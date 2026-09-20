import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getProducts } from "@/lib/queries";
import { emitEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function normalizeCategories(input: {
  categorySlug?: string;
  categorySlugs?: string[];
}): { categorySlug: string; categorySlugs: string[] } | null {
  const slugs = [
    ...new Set(
      [...(input.categorySlugs ?? []), input.categorySlug ?? ""]
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
  if (slugs.length === 0) return null;
  return { categorySlug: slugs[0], categorySlugs: slugs };
}

type ProductPayload = {
  slug: string;
  name: string;
  categorySlug?: string;
  categorySlugs?: string[];
  price: number;
  compareAtPrice?: number | null;
  shortDescription?: string;
  description?: string;
  material?: string;
  images?: string[];
  colors?: string[];
  details?: string[];
  rating?: number;
  reviewCount?: number;
  stock?: number;
  badge?: string | null;
  isNew?: boolean;
  isBestSeller?: boolean;
};

function sanitize(body: ProductPayload) {
  const cats = normalizeCategories(body);
  if (!cats) return null;
  const numRating = Number(body.rating);
  const numReview = Number(body.reviewCount);
  const numStock = Number(body.stock);
  const numCompare = Number(body.compareAtPrice);

  return {
    slug: body.slug.trim(),
    name: body.name.trim(),
    categorySlug: cats.categorySlug,
    categorySlugs: cats.categorySlugs,
    price: Math.max(0, Math.round(Number(body.price) || 0)),
    compareAtPrice: !Number.isNaN(numCompare) && numCompare > 0 ? Math.round(numCompare) : null,
    shortDescription: body.shortDescription ?? "",
    description: body.description ?? "",
    material: body.material ?? "",
    images: Array.isArray(body.images) ? body.images : [],
    colors: Array.isArray(body.colors) ? body.colors : [],
    details: Array.isArray(body.details) ? body.details : [],
    rating: !Number.isNaN(numRating) ? Math.max(0, Math.min(50, Math.round(numRating))) : 50,
    reviewCount: !Number.isNaN(numReview) ? Math.max(0, Math.round(numReview)) : 0,
    stock: !Number.isNaN(numStock) ? Math.max(0, Math.round(numStock)) : 24,
    badge: body.badge?.trim() || null,
    isNew: Boolean(body.isNew),
    isBestSeller: Boolean(body.isBestSeller),
  };
}

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated(request))) return unauthorized();
  try {
    const all = await getProducts();
    return NextResponse.json({ products: all });
  } catch {
    return NextResponse.json({ products: [] });
  }
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated(request))) return unauthorized();
  try {
    const body = (await request.json()) as ProductPayload;
    const clean = sanitize(body);
    if (!clean || !clean.name || !clean.slug || clean.price <= 0) {
      return NextResponse.json({ error: "Name, slug, category and price are required." }, { status: 400 });
    }

    if (!db) {
      return NextResponse.json({ error: "Database not configured." }, { status: 500 });
    }

    try {
      const existing = await db.select().from(products).where(eq(products.slug, clean.slug));
      if (existing.length > 0) {
        return NextResponse.json({ error: "A product with this slug already exists." }, { status: 409 });
      }
      const result = await db.insert(products).values(clean).returning();
      if (result.length > 0) {
        emitEvent("product.created", {
          slug: result[0].slug,
          name: result[0].name,
          category: result[0].categorySlug,
          price: result[0].price,
          compareAtPrice: result[0].compareAtPrice,
          stock: result[0].stock,
          isBestSeller: result[0].isBestSeller,
          createdAt: new Date().toISOString(),
        }).catch((err) => console.error("[admin products] emitEvent product.created error:", err));
      }
      return NextResponse.json({ product: result[0] });
    } catch (error) {
      console.error("admin product create error", error);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
  } catch (error) {
    console.error("admin product create error", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  return NextResponse.json({ error: "Use /api/admin/products/[id]" }, { status: 405 });
}

export async function DELETE(request: Request) {
  return NextResponse.json({ error: "Use /api/admin/products/[id]" }, { status: 405 });
}
