"use client";

import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import { CloseIcon, BagIcon } from "@/components/icons";
import {
  formatPrice,
  shippingFor,
} from "@/lib/format";

export function CartDrawer() {
  const { isOpen, closeCart, items, subtotal, updateQuantity, removeItem } =
    useCart();

  const shipping = shippingFor(subtotal);

  return (
    <div
      className={`fixed inset-0 z-50 ${isOpen ? "" : "pointer-events-none"}`}
      aria-hidden={!isOpen}
    >
      <button
        aria-label="Close cart overlay"
        onClick={closeCart}
        className={`absolute inset-0 bg-ink/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
      />
      <aside
        className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-cream shadow-2xl transition-transform duration-400 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <h2 className="font-serif text-2xl text-ink">Your Jewellery Box</h2>
          <button aria-label="Close cart" onClick={closeCart}>
            <CloseIcon className="h-5 w-5 text-ink transition hover:text-rose" />
          </button>
        </div>

        <div className="border-b border-line bg-blush-soft/60 px-6 py-3" />

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <BagIcon className="h-10 w-10 text-rose-light" />
              <p className="font-serif text-xl text-ink">Your box is empty</p>
              <p className="max-w-xs text-sm text-muted">
                Discover hand-finished pieces made to be worn every day and
                treasured for years.
              </p>
              <Link
                href="/shop"
                onClick={closeCart}
                className="mt-2 rounded-sm bg-rose-deep px-6 py-3 text-[0.68rem] tracking-[0.22em] uppercase text-cream transition hover:bg-rose"
              >
                Explore the collection
              </Link>
            </div>
          ) : (
            <ul className="flex flex-col gap-5">
              {items.map((item) => (
                <li
                  key={`${item.slug}-${item.variant}`}
                  className="flex gap-4 border-b border-line/70 pb-5"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-24 w-20 rounded-sm object-cover"
                  />
                  <div className="flex flex-1 flex-col">
                    <Link
                      href={`/product/${item.slug}`}
                      onClick={closeCart}
                      className="font-serif text-lg leading-snug text-ink transition hover:text-rose"
                    >
                      {item.name}
                    </Link>
                    <p className="mt-0.5 text-xs tracking-[0.12em] uppercase text-muted">
                      {item.variant}
                    </p>
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <div className="flex items-center gap-3 border border-line px-2 py-1">
                        <button
                          aria-label="Decrease quantity"
                          onClick={() =>
                            updateQuantity(
                              item.slug,
                              item.variant,
                              item.quantity - 1,
                            )
                          }
                          className="text-ink transition hover:text-rose"
                        >
                          −
                        </button>
                        <span className="w-5 text-center text-sm">
                          {item.quantity}
                        </span>
                        <button
                          aria-label="Increase quantity"
                          onClick={() =>
                            updateQuantity(
                              item.slug,
                              item.variant,
                              item.quantity + 1,
                            )
                          }
                          className="text-ink transition hover:text-rose"
                        >
                          +
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-ink">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                        <button
                          onClick={() => removeItem(item.slug, item.variant)}
                          className="text-[0.65rem] tracking-[0.14em] uppercase text-muted transition hover:text-rose-deep"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-line px-6 py-5">
            <div className="flex items-center justify-between text-sm text-ink-soft">
              <span>Subtotal</span>
              <span className="text-ink">{formatPrice(subtotal)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm text-ink-soft">
              <span>Shipping</span>
              <span className="text-ink">
                {formatPrice(shipping)}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-line pt-3 font-serif text-xl text-ink">
              <span>Total</span>
              <span>{formatPrice(subtotal + shipping)}</span>
            </div>
            <Link
              href="/checkout"
              onClick={closeCart}
              className="mt-5 block rounded-sm bg-gradient-to-r from-rose-deep to-rose px-6 py-3.5 text-center text-[0.7rem] tracking-[0.24em] uppercase text-cream transition hover:from-rose hover:to-rose-deep"
            >
              Proceed to checkout
            </Link>
            <Link
              href="/cart"
              onClick={closeCart}
              className="mt-2 block py-2 text-center text-[0.68rem] tracking-[0.18em] uppercase text-muted transition hover:text-rose-deep"
            >
              View full bag
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}
