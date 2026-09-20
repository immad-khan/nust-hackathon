import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getAllOrdersWithItems } from "@/lib/queries";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated(request))) return unauthorized();
  try {
    const list = await getAllOrdersWithItems();
    return NextResponse.json({ orders: list });
  } catch (error) {
    console.error("admin orders get error", error);
    return NextResponse.json({ orders: [] });
  }
}

export async function PATCH(request: Request) {
  if (!(await isAdminAuthenticated(request))) return unauthorized();
  try {
    const body = (await request.json()) as {
      orderNumber?: string;
      status?: string;
      adminSeen?: boolean;
    };

    if (!body.orderNumber) {
      return NextResponse.json({ error: "orderNumber is required" }, { status: 400 });
    }

    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const updates: Partial<{ status: string; adminSeen: boolean }> = {};
    if (body.status !== undefined) updates.status = body.status;
    if (body.adminSeen !== undefined) updates.adminSeen = Boolean(body.adminSeen);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    await db
      .update(orders)
      .set(updates)
      .where(eq(orders.orderNumber, body.orderNumber));

    // If status was changed, optionally trigger webhook with deterministic eventId
    if (body.status) {
      const eventId = `order.status_changed:${body.orderNumber}:${body.status}`;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      fetch(`${appUrl}/api/webhooks/order-created`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_number: body.orderNumber, event_id: eventId }),
      }).catch((err) => console.error("Order status change webhook error:", err));
    }

    return NextResponse.json({ success: true, updates });
  } catch (error) {
    console.error("admin orders patch error", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
