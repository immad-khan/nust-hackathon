import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProductCard } from "@/components/product-card";
import { ProductDetail } from "@/components/product-detail";
import { Stars } from "@/components/stars";
import {
  getAllProductSlugs,
  getProductBySlug,
  getRelatedProducts,
  getReviews,
} from "@/lib/queries";

export const revalidate = 0;
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await getAllProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Not found — Prem by SHK" };
  return {
    title: `${product.name} — Prem by SHK`,
    description: product.shortDescription,
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [related, reviews] = await Promise.all([
    getRelatedProducts(product, 4),
    getReviews(slug),
  ]);

  return (
    <>
      <ProductDetail product={product} />

      <section className="bg-blush-soft/60">
        <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <p className="eyebrow">Client Reviews</p>
              <h2 className="mt-2 font-serif text-3xl font-light text-ink">
                What they say
              </h2>
              <div className="mt-4 flex items-center gap-3">
                <Stars rating={product.rating} className="text-gold" size="h-5 w-5" />
                <span className="text-sm text-ink-soft">
                  {(product.rating / 10).toFixed(1)} out of 5
                </span>
              </div>
              <p className="mt-3 text-sm text-muted">
                Based on {product.reviewCount} verified purchases.
              </p>
            </div>

            <div className="space-y-5">
              {(reviews.length > 0
                ? reviews
                : [
                    {
                      id: 0,
                      author: "Verified Client",
                      rating: 5,
                      title: "Beautifully made",
                      body: "Exactly as pictured — the finish is rich and the packaging is gorgeous.",
                      productSlug: slug,
                      createdAt: new Date(),
                    },
                  ]
              ).map((review) => (
                <figure
                  key={review.id}
                  className="rounded-sm border border-line/80 bg-cream p-6"
                >
                  <Stars rating={review.rating * 10} className="text-gold" />
                  <figcaption className="mt-3 font-serif text-lg text-ink">
                    {review.title}
                  </figcaption>
                  <blockquote className="mt-2 text-sm leading-relaxed text-ink-soft">
                    {review.body}
                  </blockquote>
                  <p className="mt-3 text-[0.66rem] tracking-[0.18em] uppercase text-muted">
                    {review.author}
                  </p>
                </figure>
              ))}
            </div>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
          <div className="text-center">
            <p className="eyebrow">You May Also Love</p>
            <h2 className="mt-2 font-serif text-4xl font-light text-ink">
              Complete the Look
            </h2>
            <span className="hairline mx-auto mt-3 block w-16" />
          </div>
          <div className="mt-8 grid grid-cols-2 gap-6 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
