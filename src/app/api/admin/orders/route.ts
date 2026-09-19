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
    const body = (await request.json()) as { orderNumber?: string; status?: string };
    if (!body.orderNumber || !body.status) {
      return NextResponse.json({ error: "orderNumber and status are required" }, { status: 400 });
    }

    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    await db
      .update(orders)
      .set({ status: body.status })
      .where(eq(orders.orderNumber, body.orderNumber));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("admin orders patch error", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
