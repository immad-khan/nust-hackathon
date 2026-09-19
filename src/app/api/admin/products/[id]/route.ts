import { NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { isAdminAuthenticated } from "@/lib/admin-auth";

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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminAuthenticated(request))) return unauthorized();
  try {
    const { id } = await params;
    const idNum = parseInt(id, 10);
    const isNumeric = !Number.isNaN(idNum);

    const body = (await request.json()) as ProductPayload;
    const clean = sanitize(body);
    if (!clean || !clean.name || !clean.slug || clean.price <= 0) {
      return NextResponse.json({ error: "Name, slug, category and price are required." }, { status: 400 });
    }

    if (!db) {
      return NextResponse.json({ error: "Database not configured." }, { status: 500 });
    }

    try {
      const condition = isNumeric
        ? or(eq(products.id, idNum), eq(products.slug, id), eq(products.slug, clean.slug))
        : or(eq(products.slug, id), eq(products.slug, clean.slug));

      const result = await db.update(products).set(clean).where(condition).returning();
      if (result.length > 0) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        fetch(`${appUrl}/api/webhooks/inventory-updated`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: result[0].slug }),
        }).catch((err) => console.error("Inventory webhook trigger error:", err));
        return NextResponse.json({ product: result[0] });
      }

      const inserted = await db.insert(products).values(clean).returning();
      if (inserted.length > 0) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        fetch(`${appUrl}/api/webhooks/inventory-updated`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: inserted[0].slug }),
        }).catch((err) => console.error("Inventory webhook trigger error:", err));
        return NextResponse.json({ product: inserted[0] });
      }
    } catch (error) {
      console.error("DB update error", error);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }

    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    console.error("admin product update error", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminAuthenticated(request))) return unauthorized();
  try {
    const { id } = await params;
    const idNum = parseInt(id, 10);
    const isNumeric = !Number.isNaN(idNum);

    if (!db) {
      return NextResponse.json({ error: "Database not configured." }, { status: 500 });
    }

    try {
      const condition = isNumeric
        ? or(eq(products.id, idNum), eq(products.slug, id))
        : eq(products.slug, id);
      await db.delete(products).where(condition);
    } catch (error) {
      console.error("DB delete error", error);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
