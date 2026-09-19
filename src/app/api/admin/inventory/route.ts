import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getProducts } from "@/lib/queries";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated(request))) return unauthorized();
  try {
    const list = await getProducts();
    return NextResponse.json({ products: list });
  } catch (error) {
    console.error("admin inventory get error", error);
    return NextResponse.json({ products: [] });
  }
}

export async function PATCH(request: Request) {
  if (!(await isAdminAuthenticated(request))) return unauthorized();
  try {
    const body = (await request.json()) as { id?: number; slug?: string; stock?: number; price?: number };
    if ((body.id === undefined && !body.slug) || body.stock === undefined) {
      return NextResponse.json({ error: "Product identifier and stock are required" }, { status: 400 });
    }

    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const newStock = Math.max(0, Math.round(Number(body.stock) || 0));

    let targetSlug = body.slug;
    if (body.id) {
      const updated = await db
        .update(products)
        .set({ stock: newStock })
        .where(eq(products.id, body.id))
        .returning({ slug: products.slug });
      if (updated[0]?.slug) targetSlug = updated[0].slug;
    } else if (body.slug) {
      await db.update(products).set({ stock: newStock }).where(eq(products.slug, body.slug));
    }

    if (targetSlug) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      fetch(`${appUrl}/api/webhooks/inventory-updated`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: targetSlug }),
      }).catch((err) => console.error("Inventory webhook trigger error:", err));
    }

    return NextResponse.json({ success: true, stock: newStock });
  } catch (error) {
    console.error("admin inventory patch error", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
