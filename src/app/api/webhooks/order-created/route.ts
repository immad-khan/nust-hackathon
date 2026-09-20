import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems, syncLog } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { order_number, event_id } = body;

    if (!order_number) {
      return NextResponse.json(
        { error: "order_number is required" },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const eventId = event_id || `order.created:${order_number}`;

    // Deduplication check via syncLog table
    const [existingLog] = await db
      .select()
      .from(syncLog)
      .where(eq(syncLog.eventId, eventId));

    if (existingLog && existingLog.status === "success") {
      return NextResponse.json(
        { success: true, deduplicated: true, synced: order_number, eventId },
        { status: 200 }
      );
    }

    // Fetch the order from Supabase via Drizzle
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, order_number));

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Fetch order items
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderNumber, order_number));

    // Format items as a single readable string for Notion
    const itemsSummary = items
      .map((item) => `${item.quantity}x ${item.name}${item.variant ? ` (${item.variant})` : ""}`)
      .join(", ");

    // Build payload for Fastn
    const fastnPayload = {
      event_id: eventId,
      order_number: order.orderNumber,
      customer_name: order.customerName,
      customer_email: order.email,
      phone: order.phone,
      address: order.address,
      city: order.city,
      country: order.country,
      items: itemsSummary,
      subtotal: order.subtotal,
      shipping: order.shipping,
      total: order.total,
      status: order.status,
      note: order.note,
      created_at: order.createdAt,
    };

    // Ensure initial log entry exists
    await db
      .insert(syncLog)
      .values({
        eventId,
        type: "order.created",
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

    const webhookUrl = process.env.FASTN_ORDER_WEBHOOK_URL;
    if (!webhookUrl) {
      console.warn("FASTN_ORDER_WEBHOOK_URL is not set. Skipped remote dispatch.");
      await db
        .update(syncLog)
        .set({ status: "success", error: "FASTN_ORDER_WEBHOOK_URL not configured yet (local-success)" })
        .where(eq(syncLog.eventId, eventId));

      return NextResponse.json({
        success: true,
        synced: order_number,
        eventId,
        notice: "FASTN_ORDER_WEBHOOK_URL not configured yet",
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
      console.error("Fastn webhook failed:", errText);
      await db
        .update(syncLog)
        .set({ status: "failed", error: errText.slice(0, 500) })
        .where(eq(syncLog.eventId, eventId));

      return NextResponse.json(
        { error: "Failed to sync to Fastn", details: errText },
        { status: 500 }
      );
    }

    // Update syncLog to success
    await db
      .update(syncLog)
      .set({ status: "success", error: "" })
      .where(eq(syncLog.eventId, eventId));

    return NextResponse.json(
      { success: true, synced: order_number, eventId },
      { status: 200 }
    );
  } catch (err) {
    console.error("Order webhook error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
