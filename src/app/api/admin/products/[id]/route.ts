import { NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { isAdminAuthenticated } from "@/lib/admin-auth";
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
        emitEvent("product.updated", {
          slug: result[0].slug,
          name: result[0].name,
          category: result[0].categorySlug,
          price: result[0].price,
          compareAtPrice: result[0].compareAtPrice,
          stock: result[0].stock,
          isBestSeller: result[0].isBestSeller,
          updatedAt: new Date().toISOString(),
        }).catch((err) => console.error("[admin product PUT] emitEvent product.updated error:", err));

        if (result[0].stock < 10) {
          emitEvent("stock.low", {
            slug: result[0].slug,
            name: result[0].name,
            stock: result[0].stock,
            price: result[0].price,
            updatedAt: new Date().toISOString(),
          }).catch((err) => console.error("[admin product PUT] emitEvent stock.low error:", err));
        }

        return NextResponse.json({ product: result[0] });
      }

      const inserted = await db.insert(products).values(clean).returning();
      if (inserted.length > 0) {
        emitEvent("product.created", {
          slug: inserted[0].slug,
          name: inserted[0].name,
          category: inserted[0].categorySlug,
          price: inserted[0].price,
          compareAtPrice: inserted[0].compareAtPrice,
          stock: inserted[0].stock,
          isBestSeller: inserted[0].isBestSeller,
          createdAt: new Date().toISOString(),
        }).catch((err) => console.error("[admin product PUT] emitEvent product.created error:", err));

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
