import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getAllOrdersWithItems } from "@/lib/queries";
import { emitEvent } from "@/lib/events";
import { sendMail, renderOrderStatusUpdateHtml } from "@/lib/email";

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

    // If status was changed, emit order.status_changed event
    if (body.status) {
      // Fetch order details for rich webhook payload
      const [orderRow] = await db
        .select()
        .from(orders)
        .where(eq(orders.orderNumber, body.orderNumber));

      if (orderRow) {
        emitEvent("order.status_changed", {
          orderNumber: orderRow.orderNumber,
          customerName: orderRow.customerName,
          customerEmail: orderRow.email,
          newStatus: body.status,
          total: orderRow.total,
          updatedAt: new Date().toISOString(),
        }).catch((err) => console.error("[admin orders] emitEvent order.status_changed error:", err));

        // Customer status update email
        if (orderRow.email) {
          try {
            await sendMail({
              to: orderRow.email,
              subject: `Order #${orderRow.orderNumber} Status Update: ${body.status.toUpperCase()} — Prem by SHK`,
              html: renderOrderStatusUpdateHtml({
                orderNumber: orderRow.orderNumber,
                customerName: orderRow.customerName,
                newStatus: body.status,
                total: orderRow.total,
              }),
              eventId: `email:order.status_changed:${orderRow.orderNumber}:${body.status}`,
              metadata: { orderNumber: orderRow.orderNumber, newStatus: body.status },
            });
          } catch (emailErr) {
            console.error("[admin orders] Status update email error:", emailErr);
          }
        }
      }
    }

    return NextResponse.json({ success: true, updates });
  } catch (error) {
    console.error("admin orders patch error", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
