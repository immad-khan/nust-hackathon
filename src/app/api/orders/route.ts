import { NextResponse } from "next/server";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, products, syncLog } from "@/db/schema";
import { getProductsBySlugs } from "@/lib/queries";
import { shippingFor } from "@/lib/format";

export const dynamic = "force-dynamic";

type IncomingItem = {
  slug: string;
  variant?: string;
  quantity?: number;
};

type OrderPayload = {
  customerName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  note?: string;
  items?: IncomingItem[];
};

function orderNumber() {
  const stamp = Date.now().toString(36).toUpperCase().slice(-6);
  const rand = Math.random().toString(36).toUpperCase().slice(2, 5);
  return `PRM-${stamp}${rand}`;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as OrderPayload;
    const items = payload.items ?? [];

    if (!payload.customerName || !payload.email || items.length === 0) {
      return NextResponse.json(
        { error: "Name, email and at least one item are required." },
        { status: 400 },
      );
    }

    const catalogue = await getProductsBySlugs(items.map((item) => item.slug));
    if (catalogue.length === 0) {
      return NextResponse.json({ error: "No valid items in order." }, { status: 400 });
    }

    const priced = items
      .map((item) => {
        const product = catalogue.find((row) => row.slug === item.slug);
        if (!product) return null;
        const quantity = Math.max(1, Math.min(20, item.quantity ?? 1));
        return {
          productSlug: product.slug,
          name: product.name,
          variant: item.variant ?? product.colors[0] ?? "Gold",
          image: product.images[0] ?? "",
          unitPrice: product.price,
          quantity,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (priced.length === 0) {
      return NextResponse.json({ error: "No available products found." }, { status: 400 });
    }

    const subtotal = priced.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );
    const shipping = shippingFor(subtotal);
    const number = orderNumber();
    const eventId = `order.created:${number}`;

    if (db) {
      // Execute order creation + atomic stock decrement in a transaction
      try {
        await db.transaction(async (tx) => {
          // 1. Atomically decrement stock for each item (prevents race-condition overselling)
          for (const item of priced) {
            const updated = await tx
              .update(products)
              .set({ stock: sql`${products.stock} - ${item.quantity}` })
              .where(
                and(
                  eq(products.slug, item.productSlug),
                  gte(products.stock, item.quantity)
                )
              )
              .returning({ slug: products.slug, stock: products.stock, name: products.name });

            if (updated.length === 0) {
              throw new Error(`INSUFFICIENT_STOCK:${item.name}`);
            }
          }

          // 2. Insert order record
          await tx.insert(orders).values({
            orderNumber: number,
            customerName: payload.customerName!,
            email: payload.email!,
            phone: payload.phone ?? "",
            address: payload.address ?? "",
            city: payload.city ?? "",
            postalCode: payload.postalCode ?? "",
            country: payload.country ?? "Pakistan",
            note: payload.note ?? "",
            subtotal,
            shipping,
            total: subtotal + shipping,
            status: "confirmed",
            adminSeen: false,
          });

          // 3. Insert order items
          await tx
            .insert(orderItems)
            .values(priced.map((item) => ({ ...item, orderNumber: number })));

          // 4. Record sync log event for deduplication & failure tracking
          await tx
            .insert(syncLog)
            .values({
              eventId,
              type: "order.created",
              status: "pending",
              attempts: 0,
              error: "",
              payload: {
                orderNumber: number,
                customerName: payload.customerName,
                email: payload.email,
                total: subtotal + shipping,
                itemsCount: priced.length,
              },
            })
            .onConflictDoNothing();
        });
      } catch (txError) {
        if (txError instanceof Error && txError.message.startsWith("INSUFFICIENT_STOCK:")) {
          const itemName = txError.message.replace("INSUFFICIENT_STOCK:", "");
          return NextResponse.json(
            { error: `Insufficient stock for "${itemName}". Please reduce quantity or choose another item.` },
            { status: 409 }
          );
        }
        throw txError;
      }

      // Trigger order-created webhook (Fastn / Notion sync)
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      fetch(`${appUrl}/api/webhooks/order-created`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_number: number, event_id: eventId }),
      }).catch((err) => console.error("Order webhook trigger error:", err));

      // Trigger inventory-updated webhook for all modified products
      for (const item of priced) {
        fetch(`${appUrl}/api/webhooks/inventory-updated`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: item.productSlug }),
        }).catch((err) => console.error("Inventory webhook trigger error:", err));
      }
    }

    return NextResponse.json({ orderNumber: number, total: subtotal + shipping });
  } catch (error) {
    console.error("order error", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
