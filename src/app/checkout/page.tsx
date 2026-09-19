"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/components/cart-provider";
import { GiftIcon, LockIcon } from "@/components/icons";
import { formatPrice, shippingFor } from "@/lib/format";

const FIELDS = [
  { name: "customerName", label: "Full name", type: "text", required: true },
  { name: "email", label: "Email address", type: "email", required: true },
  { name: "phone", label: "Phone number", type: "tel", required: true },
  { name: "address", label: "Delivery address", type: "text", required: true },
  { name: "city", label: "City", type: "text", required: true },
  { name: "postalCode", label: "Postal code", type: "text", required: false },
] as const;

export default function CheckoutPage() {
  const { items, subtotal, clear, ready } = useCart();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({
    customerName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    note: "",
  });

  const shipping = shippingFor(subtotal);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (items.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          country: "Pakistan",
          items: items.map((item) => ({
            slug: item.slug,
            variant: item.variant,
            quantity: item.quantity,
          })),
        }),
      });
      const data = (await res.json()) as { orderNumber?: string; error?: string };
      if (!res.ok || !data.orderNumber) {
        throw new Error(data.error ?? "Could not place your order.");
      }
      clear();
      router.push(`/order/${data.orderNumber}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  if (ready && items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-serif text-4xl font-light text-ink">
          Nothing to check out yet
        </h1>
        <p className="mt-3 text-sm text-muted">
          Add a piece to your bag and we will take care of the rest.
        </p>
        <Link
          href="/shop"
          className="mt-7 inline-block rounded-sm bg-rose-deep px-7 py-3.5 text-[0.68rem] tracking-[0.22em] uppercase text-cream"
        >
          Browse the collection
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 lg:px-8">
      <p className="eyebrow">Almost Yours</p>
      <h1 className="mt-2 font-serif text-5xl font-light text-ink">Checkout</h1>
      <span className="hairline mt-4 block w-20" />

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <form onSubmit={submit} className="space-y-6">
          <div className="rounded-sm border border-line bg-cream p-7">
            <h2 className="font-serif text-2xl text-ink">Delivery Details</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {FIELDS.map((field) => (
                <label
                  key={field.name}
                  className={`block ${
                    field.name === "address" ? "sm:col-span-2" : ""
                  }`}
                >
                  <span className="text-[0.66rem] tracking-[0.18em] uppercase text-muted">
                    {field.label}
                    {field.required ? " *" : ""}
                  </span>
                  <input
                    type={field.type}
                    required={field.required}
                    value={form[field.name] ?? ""}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, [field.name]: e.target.value }))
                    }
                    className="mt-2 w-full border-b border-line bg-transparent py-2 text-sm text-ink outline-none transition focus:border-rose"
                  />
                </label>
              ))}
              <label className="block sm:col-span-2">
                <span className="text-[0.66rem] tracking-[0.18em] uppercase text-muted">
                  Gift note (optional)
                </span>
                <textarea
                  rows={3}
                  value={form.note}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, note: e.target.value }))
                  }
                  placeholder="We will hand-write your message on our signature card."
                  className="mt-2 w-full border-b border-line bg-transparent py-2 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-rose"
                />
              </label>
            </div>
          </div>

          <div className="rounded-sm border border-line bg-blush-soft/50 p-7">
            <h2 className="font-serif text-2xl text-ink">Payment</h2>
            <p className="mt-2 text-sm text-ink-soft">
              Cash on delivery and bank transfer are available nationwide. Our
              client care team will confirm your order by phone within 24 hours.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted">
              <LockIcon className="h-4 w-4 text-rose" />
              Your details are encrypted and never shared.
            </div>
          </div>

          {error && (
            <p className="rounded-sm border border-rose/40 bg-blush/50 px-4 py-3 text-sm text-rose-deep">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-sm bg-gradient-to-r from-rose-deep to-rose px-8 py-4 text-[0.7rem] tracking-[0.24em] uppercase text-cream transition hover:from-rose hover:to-rose-deep disabled:opacity-60"
          >
            {submitting ? "Placing your order…" : "Place order"}
          </button>
        </form>

        <aside className="h-fit rounded-sm border border-line bg-cream p-7">
          <h2 className="font-serif text-2xl text-ink">Your Order</h2>
          <span className="hairline mt-3 block w-14" />
          <ul className="mt-6 space-y-4">
            {items.map((item) => (
              <li key={`${item.slug}-${item.variant}`} className="flex gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-20 w-16 rounded-sm object-cover"
                />
                <div className="flex-1 text-sm">
                  <p className="font-serif text-base text-ink">{item.name}</p>
                  <p className="text-[0.66rem] tracking-[0.14em] uppercase text-muted">
                    {item.variant} · Qty {item.quantity}
                  </p>
                </div>
                <p className="text-sm text-ink">
                  {formatPrice(item.price * item.quantity)}
                </p>
              </li>
            ))}
          </ul>
          <dl className="mt-6 space-y-3 border-t border-line pt-5 text-sm">
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
          <p className="mt-5 flex items-center gap-2 text-xs text-muted">
            <GiftIcon className="h-4 w-4 text-rose" />
            Every order arrives in signature blush packaging.
          </p>
        </aside>
      </div>
    </div>
  );
}
