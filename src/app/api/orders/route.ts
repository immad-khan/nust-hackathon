import { NextResponse } from "next/server";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, products, syncLog } from "@/db/schema";
import { getProductsBySlugs } from "@/lib/queries";
import { shippingFor } from "@/lib/format";
import { emitEvent } from "@/lib/events";
import {
  sendMail,
  renderOrderConfirmationHtml,
  renderAdminOrderAlertHtml,
} from "@/lib/email";

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
      const remainingStocks: Record<string, number> = {};

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

            remainingStocks[item.productSlug] = updated[0].stock;
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

      // Format items summary
      const itemsSummary = priced
        .map((item) => `${item.quantity}x ${item.name}${item.variant ? ` (${item.variant})` : ""}`)
        .join(", ");

      // Core: emit order.created event (with automatic sync_log upsert, retries & Fastn post)
      emitEvent("order.created", {
        orderNumber: number,
        customerName: payload.customerName,
        customerEmail: payload.email,
        phone: payload.phone ?? "",
        address: payload.address ?? "",
        city: payload.city ?? "",
        country: payload.country ?? "Pakistan",
        items: itemsSummary,
        subtotal,
        shipping,
        total: subtotal + shipping,
        status: "confirmed",
        note: payload.note ?? "",
        createdAt: new Date().toISOString(),
      }).catch((err) => console.error("[orders] emitEvent order.created error:", err));

      // Core: emit product.updated & stock.low events for affected items
      for (const item of priced) {
        const newStock = remainingStocks[item.productSlug] ?? 0;
        emitEvent("product.updated", {
          slug: item.productSlug,
          name: item.name,
          stock: newStock,
          price: item.unitPrice,
        }).catch((err) => console.error("[orders] emitEvent product.updated error:", err));

        if (newStock < 10) {
          emitEvent("stock.low", {
            slug: item.productSlug,
            name: item.name,
            stock: newStock,
            price: item.unitPrice,
          }).catch((err) => console.error("[orders] emitEvent stock.low error:", err));
        }
      }

      // Email notifications (Customer confirmation + Admin new order alert)
      try {
        const orderEmailData = {
          orderNumber: number,
          customerName: payload.customerName!,
          email: payload.email!,
          phone: payload.phone ?? "",
          address: payload.address ?? "",
          city: payload.city ?? "",
          country: payload.country ?? "Pakistan",
          items: priced.map((p) => ({
            name: p.name,
            variant: p.variant,
            quantity: p.quantity,
            unitPrice: p.unitPrice,
            image: p.image,
          })),
          subtotal,
          shipping,
          total: subtotal + shipping,
          status: "confirmed",
          note: payload.note ?? "",
          createdAt: new Date().toISOString(),
        };

        const adminEmail =
          process.env.EMAIL_HOST_USER ||
          process.env.SMTP_USER ||
          "immadonline702@gmail.com";

        // Await emails before returning so serverless function does not exit early
        await Promise.allSettled([
          sendMail({
            to: payload.email!,
            subject: `Order Confirmation #${number} — Prem by SHK`,
            html: renderOrderConfirmationHtml(orderEmailData),
            eventId: `email:order.confirmation:${number}`,
            metadata: { orderNumber: number, recipientType: "customer" },
          }),
          sendMail({
            to: adminEmail,
            subject: `🔔 New Order #${number} from ${payload.customerName}`,
            html: renderAdminOrderAlertHtml(orderEmailData),
            eventId: `email:order.admin_alert:${number}`,
            metadata: { orderNumber: number, recipientType: "admin" },
          }),
        ]);
      } catch (emailErr) {
        console.error("[orders] Email dispatch error:", emailErr);
      }
    }

    return NextResponse.json({ orderNumber: number, total: subtotal + shipping });
  } catch (error) {
    console.error("order error", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
