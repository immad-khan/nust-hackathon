import { NextResponse } from "next/server";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
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
      return NextResponse.json({ error: "No valid items." }, { status: 400 });
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

    const subtotal = priced.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );
    const shipping = shippingFor(subtotal);
    const number = orderNumber();

    if (db) {
      await db.insert(orders).values({
        orderNumber: number,
        customerName: payload.customerName,
        email: payload.email,
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
      });

      await db
        .insert(orderItems)
        .values(priced.map((item) => ({ ...item, orderNumber: number })));
    }

    return NextResponse.json({ orderNumber: number, total: subtotal + shipping });
  } catch (error) {
    console.error("order error", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
