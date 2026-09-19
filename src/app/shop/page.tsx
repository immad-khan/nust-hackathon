import Link from "next/link";
import { Suspense } from "react";
import { ProductCard } from "@/components/product-card";
import { ShopFilters } from "@/components/shop-filters";
import { getCategories, getProducts } from "@/lib/queries";

export const revalidate = 60;

type SearchParams = Promise<{
  category?: string;
  sort?: string;
  q?: string;
  min?: string;
  max?: string;
}>;

export default async function ShopPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const [categories, products] = await Promise.all([
    getCategories(),
    getProducts({
      category: sp.category,
      sort: sp.sort,
      q: sp.q,
      min: sp.min ? Number(sp.min) : undefined,
      max: sp.max ? Number(sp.max) : undefined,
    }),
  ]);

  const activeCategory = categories.find((c) => c.slug === sp.category);
  const heading = sp.q
    ? `Results for “${sp.q}”`
    : (activeCategory?.name ?? "All Jewellery");

  return (
    <>
      <section className="bg-gradient-to-r from-cream-deep via-blush-soft to-blush">
        <div className="mx-auto max-w-7xl px-4 py-14 text-center lg:px-8">
          <p className="eyebrow">The Collection</p>
          <h1 className="mt-3 font-serif text-5xl font-light text-ink">
            {heading}
          </h1>
          <span className="hairline mx-auto mt-4 block w-20" />
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-ink-soft">
            {activeCategory?.tagline ??
              "Hand-finished pieces in warm gold, mother-of-pearl and hand-poured enamel — designed to be worn every day and treasured for years."}
          </p>
        </div>
      </section>

      <Suspense fallback={<div className="h-16 border-y border-line" />}>
        <ShopFilters categories={categories} total={products.length} />
      </Suspense>

      <section className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        {products.length === 0 ? (
          <div className="py-20 text-center">
            <h2 className="font-serif text-3xl text-ink">Nothing here yet</h2>
            <p className="mt-3 text-sm text-muted">
              Try another category or clear your filters.
            </p>
            <Link
              href="/shop"
              className="mt-6 inline-block rounded-sm bg-rose-deep px-6 py-3 text-[0.68rem] tracking-[0.22em] uppercase text-cream"
            >
              View everything
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product, i) => (
              <ProductCard key={product.id} product={product} priority={i < 4} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
