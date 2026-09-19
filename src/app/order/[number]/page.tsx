import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { GiftIcon, TruckIcon } from "@/components/icons";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

type Params = Promise<{ number: string }>;

export default async function OrderPage({ params }: { params: Params }) {
  const { number } = await params;

  if (!db) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-serif text-3xl text-ink">Order Confirmed</h1>
        <p className="mt-3 text-sm text-ink-soft">Your order reference: {number}</p>
        <Link href="/shop" className="mt-6 inline-block rounded-sm bg-rose-deep px-6 py-3 text-[0.68rem] tracking-[0.2em] uppercase text-cream">Continue Shopping</Link>
      </div>
    );
  }

  const orderRows = await db
    .select()
    .from(orders)
    .where(eq(orders.orderNumber, number))
    .limit(1);
  const order = orderRows[0];
  if (!order) notFound();

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderNumber, number));

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:px-8">
      <div className="rounded-sm border border-line bg-blush-soft/50 p-10 text-center">
        <p className="eyebrow">Thank You</p>
        <h1 className="mt-3 font-serif text-4xl font-light text-ink">
          Your order is confirmed
        </h1>
        <span className="hairline mx-auto mt-4 block w-20" />
        <p className="mt-5 text-sm leading-relaxed text-ink-soft">
          Thank you, {order.customerName.split(" ")[0]}. We have sent a
          confirmation to {order.email}. Our client care team will call you
          shortly to arrange delivery.
        </p>
        <p className="mt-6 inline-block rounded-sm border border-rose-light bg-cream px-6 py-3 font-serif text-2xl text-ink">
          {order.orderNumber}
        </p>
      </div>

      <div className="mt-10 rounded-sm border border-line bg-cream p-8">
        <h2 className="font-serif text-2xl text-ink">Order Summary</h2>
        <ul className="mt-6 divide-y divide-line">
          {items.map((item) => (
            <li key={item.id} className="flex gap-4 py-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image}
                alt={item.name}
                className="h-24 w-20 rounded-sm object-cover"
              />
              <div className="flex-1">
                <p className="font-serif text-lg text-ink">{item.name}</p>
                <p className="text-[0.66rem] tracking-[0.16em] uppercase text-muted">
                  {item.variant} · Qty {item.quantity}
                </p>
              </div>
              <p className="text-sm text-ink">
                {formatPrice(item.unitPrice * item.quantity)}
              </p>
            </li>
          ))}
        </ul>

        <dl className="mt-6 space-y-3 border-t border-line pt-5 text-sm">
          <div className="flex justify-between text-ink-soft">
            <dt>Subtotal</dt>
            <dd className="text-ink">{formatPrice(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between text-ink-soft">
            <dt>Shipping</dt>
            <dd className="text-ink">
              {formatPrice(order.shipping)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-line pt-4 font-serif text-2xl text-ink">
            <dt>Total</dt>
            <dd>{formatPrice(order.total)}</dd>
          </div>
        </dl>

        <div className="mt-8 grid gap-4 border-t border-line pt-6 text-sm text-ink-soft sm:grid-cols-2">
          <p className="flex items-start gap-3">
            <TruckIcon className="mt-0.5 h-5 w-5 shrink-0 text-rose" />
            <span>
              Delivering to
              <br />
              {order.address}, {order.city} {order.postalCode}
            </span>
          </p>
          <p className="flex items-start gap-3">
            <GiftIcon className="mt-0.5 h-5 w-5 shrink-0 text-rose" />
            <span>
              {order.note
                ? `Gift note: “${order.note}”`
                : "Arriving in signature blush packaging."}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-8 text-center">
        <Link
          href="/shop"
          className="inline-block rounded-sm bg-rose-deep px-7 py-3.5 text-[0.68rem] tracking-[0.22em] uppercase text-cream transition hover:bg-rose"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
