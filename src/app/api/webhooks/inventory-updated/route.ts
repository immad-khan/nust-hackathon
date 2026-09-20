import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, syncLog } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { slug, event_id } = body;

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

    const eventId = event_id || `inventory.updated:${product.slug}:${product.stock}`;

    // Deduplication check via syncLog table
    const [existingLog] = await db
      .select()
      .from(syncLog)
      .where(eq(syncLog.eventId, eventId));

    if (existingLog && existingLog.status === "success") {
      return NextResponse.json(
        { success: true, deduplicated: true, synced: slug, eventId },
        { status: 200 }
      );
    }

    // Build payload for Fastn
    const fastnPayload = {
      event_id: eventId,
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

    // Ensure initial log entry exists
    await db
      .insert(syncLog)
      .values({
        eventId,
        type: "inventory.updated",
        status: "pending",
        attempts: 1,
        error: "",
        payload: fastnPayload,
      })
      .onConflictDoUpdate({
        target: syncLog.eventId,
        set: {
          attempts: sql`${syncLog.attempts} + 1`,
          payload: fastnPayload,
        },
      });

    const webhookUrl = process.env.FASTN_INVENTORY_WEBHOOK_URL;
    if (!webhookUrl) {
      console.warn("FASTN_INVENTORY_WEBHOOK_URL is not set. Skipped remote dispatch.");
      await db
        .update(syncLog)
        .set({ status: "success", error: "FASTN_INVENTORY_WEBHOOK_URL not configured yet (local-success)" })
        .where(eq(syncLog.eventId, eventId));

      return NextResponse.json({
        success: true,
        synced: slug,
        eventId,
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
      const errText = await fastnRes.text();
      console.error("Fastn inventory webhook failed:", errText);
      await db
        .update(syncLog)
        .set({ status: "failed", error: errText.slice(0, 500) })
        .where(eq(syncLog.eventId, eventId));

      return NextResponse.json(
        { error: "Failed to sync inventory to Fastn", details: errText },
        { status: 500 }
      );
    }

    // Update syncLog to success
    await db
      .update(syncLog)
      .set({ status: "success", error: "" })
      .where(eq(syncLog.eventId, eventId));

    return NextResponse.json(
      { success: true, synced: slug, eventId },
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
