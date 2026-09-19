"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Product } from "@/db/schema";
import { useCart } from "@/components/cart-provider";
import { ProductCard } from "@/components/product-card";

export default function WishlistPage() {
  const { wishlist, ready } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (wishlist.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/products?slugs=${wishlist.join(",")}`)
      .then((res) => res.json())
      .then((data: { products: Product[] }) => {
        if (!cancelled) setProducts(data.products ?? []);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [wishlist, ready]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
      <p className="eyebrow">Saved for Later</p>
      <h1 className="mt-2 font-serif text-5xl font-light text-ink">Wishlist</h1>
      <span className="hairline mt-4 block w-20" />

      {loading ? (
        <div className="mt-12 grid grid-cols-2 gap-6 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="aspect-[4/5] animate-pulse rounded-sm bg-blush-soft"
            />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="mt-14 rounded-sm border border-line bg-blush-soft/50 py-20 text-center">
          <h2 className="font-serif text-3xl text-ink">
            No treasures saved yet
          </h2>
          <p className="mt-3 text-sm text-muted">
            Tap the heart on any piece to keep it here.
          </p>
          <Link
            href="/shop"
            className="mt-6 inline-block rounded-sm bg-rose-deep px-7 py-3.5 text-[0.68rem] tracking-[0.22em] uppercase text-cream transition hover:bg-rose"
          >
            Find something you love
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
