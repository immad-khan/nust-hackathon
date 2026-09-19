import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { order_number } = body;

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
    // e.g. "2x Pearl Earrings, 1x Gold Ring"
    const itemsSummary = items
      .map((item) => `${item.quantity}x ${item.name}${item.variant ? ` (${item.variant})` : ""}`)
      .join(", ");

    // Build the payload for Fastn
    const fastnPayload = {
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

    const webhookUrl = process.env.FASTN_ORDER_WEBHOOK_URL;
    if (!webhookUrl) {
      // Return success in test/dev environment if webhook URL is not configured yet
      console.warn("FASTN_ORDER_WEBHOOK_URL is not set. Skipped remote dispatch.");
      return NextResponse.json({
        success: true,
        synced: order_number,
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
      console.error("Fastn webhook failed:", await fastnRes.text());
      return NextResponse.json(
        { error: "Failed to sync to Fastn" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, synced: order_number },
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
