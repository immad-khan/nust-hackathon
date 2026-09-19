"use client";

import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import { formatPrice, shippingFor } from "@/lib/format";

export default function CartPage() {
  const { items, subtotal, updateQuantity, removeItem, ready } = useCart();
  const shipping = shippingFor(subtotal);

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 lg:px-8">
      <p className="eyebrow">Your Selection</p>
      <h1 className="mt-2 font-serif text-5xl font-light text-ink">
        Shopping Bag
      </h1>
      <span className="hairline mt-4 block w-20" />

      {ready && items.length === 0 ? (
        <div className="mt-16 rounded-sm border border-line bg-blush-soft/50 py-20 text-center">
          <h2 className="font-serif text-3xl text-ink">Your bag is empty</h2>
          <p className="mt-3 text-sm text-muted">
            Every treasure starts with one piece.
          </p>
          <Link
            href="/shop"
            className="mt-6 inline-block rounded-sm bg-rose-deep px-7 py-3.5 text-[0.68rem] tracking-[0.22em] uppercase text-cream transition hover:bg-rose"
          >
            Start exploring
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-10 lg:grid-cols-[1.6fr_1fr]">
          <ul className="divide-y divide-line">
            {items.map((item) => (
              <li
                key={`${item.slug}-${item.variant}`}
                className="flex gap-5 py-6"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-36 w-28 rounded-sm object-cover"
                />
                <div className="flex flex-1 flex-col">
                  <Link
                    href={`/product/${item.slug}`}
                    className="font-serif text-xl text-ink transition hover:text-rose-deep"
                  >
                    {item.name}
                  </Link>
                  <p className="mt-1 text-[0.68rem] tracking-[0.16em] uppercase text-muted">
                    {item.variant}
                  </p>
                  <p className="mt-2 text-sm text-ink-soft">
                    {formatPrice(item.price)}
                  </p>
                  <div className="mt-auto flex items-center justify-between pt-4">
                    <div className="flex items-center gap-4 border border-line px-3 py-2">
                      <button
                        aria-label="Decrease quantity"
                        onClick={() =>
                          updateQuantity(item.slug, item.variant, item.quantity - 1)
                        }
                        className="text-ink transition hover:text-rose"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm">
                        {item.quantity}
                      </span>
                      <button
                        aria-label="Increase quantity"
                        onClick={() =>
                          updateQuantity(item.slug, item.variant, item.quantity + 1)
                        }
                        className="text-ink transition hover:text-rose"
                      >
                        +
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="font-serif text-xl text-ink">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                      <button
                        onClick={() => removeItem(item.slug, item.variant)}
                        className="text-[0.66rem] tracking-[0.16em] uppercase text-muted transition hover:text-rose-deep"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <aside className="h-fit rounded-sm border border-line bg-blush-soft/50 p-7">
            <h2 className="font-serif text-2xl text-ink">Order Summary</h2>
            <span className="hairline mt-3 block w-14" />
            <dl className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between text-ink-soft">
                <dt>Subtotal</dt>
                <dd className="text-ink">{formatPrice(subtotal)}</dd>
              </div>
              <div className="flex justify-between text-ink-soft">
                <dt>Shipping</dt>
                <dd className="text-ink">
                  {formatPrice(shipping)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-line pt-4 font-serif text-2xl text-ink">
                <dt>Total</dt>
                <dd>{formatPrice(subtotal + shipping)}</dd>
              </div>
            </dl>
            <Link
              href="/checkout"
              className="mt-7 block rounded-sm bg-gradient-to-r from-rose-deep to-rose px-6 py-4 text-center text-[0.7rem] tracking-[0.24em] uppercase text-cream transition hover:from-rose hover:to-rose-deep"
            >
              Checkout securely
            </Link>
            <Link
              href="/shop"
              className="mt-3 block text-center text-[0.66rem] tracking-[0.18em] uppercase text-muted transition hover:text-rose-deep"
            >
              Continue shopping
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
