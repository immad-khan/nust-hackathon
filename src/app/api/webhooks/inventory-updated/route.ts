import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { slug } = body;

    if (!slug) {
      return NextResponse.json(
        { error: "product slug is required" },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // Fetch product from Supabase via Drizzle
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.slug, slug));

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Build the payload for Fastn
    const fastnPayload = {
      product_name: product.name,
      slug: product.slug,
      category: product.categorySlug,
      price: product.price,
      compare_at_price: product.compareAtPrice ?? null,
      stock: product.stock,
      material: product.material,
      badge: product.badge ?? "",
      is_best_seller: product.isBestSeller,
      is_new: product.isNew,
      rating: product.rating, // stored as /50
      updated_at: new Date().toISOString(),
    };

    const webhookUrl = process.env.FASTN_INVENTORY_WEBHOOK_URL;
    if (!webhookUrl) {
      console.warn("FASTN_INVENTORY_WEBHOOK_URL is not set. Skipped remote dispatch.");
      return NextResponse.json({
        success: true,
        synced: slug,
        notice: "FASTN_INVENTORY_WEBHOOK_URL not configured yet",
      });
    }

    // Fire to Fastn webhook
    const fastnRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fastnPayload),
    });

    if (!fastnRes.ok) {
      console.error("Fastn inventory webhook failed:", await fastnRes.text());
      return NextResponse.json(
        { error: "Failed to sync inventory to Fastn" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, synced: slug },
      { status: 200 }
    );

  } catch (err) {
    console.error("Inventory webhook error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
