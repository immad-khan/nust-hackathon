import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { Testimonials } from "@/components/testimonials";
import { ArrowRight, PROMISE_ICONS } from "@/components/icons";
import { COLLECTION_BANNERS, JOURNAL, PROMISES } from "@/lib/content";
import { getBestSellers, getCategories, getNewArrivals } from "@/lib/queries";
import { optimizeImageUrl } from "@/lib/format";

export const revalidate = 60;

const CATEGORY_IMAGES: Record<string, string> = {
  earrings: "https://res.cloudinary.com/hvt6foh0/image/upload/v1789222584/dbae1tihde4i9v5j61we.jpg",
  cuffs: "https://res.cloudinary.com/hvt6foh0/image/upload/v1789310611/dyzrmzcp6np57hkibgxz.jpg",
  rings: "https://res.cloudinary.com/hvt6foh0/image/upload/v1789310689/zo9l3ybtmstzdjfufkoi.jpg",
  bracelets: "https://res.cloudinary.com/hvt6foh0/image/upload/v1789310896/n4ebiv3q9aymaeufxaqx.jpg",
  necklaces: "https://res.cloudinary.com/hvt6foh0/image/upload/v1789224566/dboummylap7pi7vezczm.jpg",
  sets: "https://res.cloudinary.com/hvt6foh0/image/upload/v1789211119/homfy9htiqvvt5opakc0.jpg",
};

export default async function HomePage() {
  const [categories, bestSellers, newArrivals] = await Promise.all([
    getCategories(),
    getBestSellers(6),
    getNewArrivals(4),
  ]);

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden py-16 sm:py-24 lg:py-32">
        {/* Hero Background Image */}
        <div className="absolute inset-0 -z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/hero.png"
            alt="Prem by SHK Fine Jewellery"
            className="h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-cream/40" />
          <div className="absolute inset-0 bg-gradient-to-b from-cream-deep/60 via-cream/20 to-cream" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="animate-fade-up mx-auto max-w-3xl">
            <p className="eyebrow inline-flex items-center gap-3 text-xs sm:text-sm">
              <span className="hairline inline-block w-8 sm:w-10" />
              The Art of Adornment
              <span className="hairline inline-block w-8 sm:w-10" />
            </p>
            <h1 className="mt-4 font-serif text-4xl leading-[1.04] font-light text-ink sm:text-6xl md:text-7xl lg:text-[5.6rem]">
              Timeless
              <span className="mt-2 block font-script text-5xl leading-none rose-gradient-text sm:text-7xl md:text-8xl lg:text-[6.2rem]">
                Brilliance
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-ink-soft sm:text-[1rem]">
              Exquisite designs, thoughtfully crafted to make life&rsquo;s most meaningful moments even more memorable.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
              <Link
                href="/shop"
                className="group flex items-center gap-3 rounded-sm bg-gradient-to-r from-rose-deep to-rose px-7 py-4 text-[0.68rem] tracking-[0.22em] uppercase text-cream shadow-md transition hover:from-rose hover:to-rose-deep hover:shadow-lg"
              >
                Discover Signature Pieces
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/shop?category=sets"
                className="border-b border-rose pb-1 text-[0.68rem] tracking-[0.2em] uppercase text-rose-deep transition hover:border-ink hover:text-ink"
              >
                Shop Gift Sets
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[0.64rem] tracking-[0.18em] uppercase text-muted sm:text-[0.68rem]">
              <span>Hypoallergenic</span>
              <span>•</span>
              <span>Tarnish Resistant</span>
              <span>•</span>
              <span>Gift Boxed</span>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORY STRIP */}
      <section className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/shop?category=${category.slug}`}
              className="group flex flex-col items-center rounded-lg border border-line/60 bg-cream/90 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-rose-light hover:bg-cream hover:shadow-md"
            >
              <div className="h-32 w-full overflow-hidden rounded-md bg-blush-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={optimizeImageUrl(
                    CATEGORY_IMAGES[category.slug] || category.imageUrl,
                    400,
                  )}
                  alt={category.name}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <p className="mt-4 font-medium text-[0.72rem] tracking-[0.24em] uppercase text-ink">
                {category.name}
              </p>
              <span className="mt-1 text-[0.6rem] tracking-[0.3em] text-rose-light">
                — ◆ —
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* COLLECTION BANNERS */}
      <section className="mx-auto max-w-7xl px-4 pb-14 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {COLLECTION_BANNERS.map((banner) => (
            <Link
              key={banner.title}
              href={banner.href}
              className="group relative flex h-60 flex-col justify-between overflow-hidden rounded-lg p-6 shadow-sm"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={optimizeImageUrl(banner.image, 500)}
                alt={banner.title}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/30 to-transparent" />
              <div className="relative">
                <h3 className="font-serif text-2xl text-cream">{banner.title}</h3>
              </div>
              <div className="relative">
                <p className="max-w-[90%] text-xs leading-relaxed text-cream/90">
                  {banner.body}
                </p>
                <span className="mt-3 inline-flex items-center gap-2 text-[0.62rem] tracking-[0.24em] uppercase text-cream font-medium">
                  Explore
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* BEST SELLERS */}
      <section className="mx-auto max-w-7xl px-4 pb-16 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Our Signature Selection</p>
            <h2 className="mt-2 font-serif text-4xl font-light text-ink">
              Loved Most
            </h2>
            <span className="hairline mt-3 block w-16" />
          </div>
          <Link
            href="/shop"
            className="group flex items-center gap-2 text-[0.66rem] tracking-[0.22em] uppercase text-rose-deep font-medium"
          >
            View all best sellers
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-6">
          {bestSellers.map((product, i) => (
            <ProductCard key={product.id} product={product} priority={i < 3} />
          ))}
        </div>
      </section>

      {/* STORY */}
      <section className="relative overflow-hidden bg-[#FAF6F3]">
        <div className="absolute inset-y-0 right-0 z-0 w-full md:w-[65%] lg:w-[60%] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/story.png"
            alt="Prem by SHK Story"
            className="h-full w-full object-cover object-center"
          />
          <div className="pointer-events-none absolute inset-y-0 left-0 w-full sm:w-3/5 bg-gradient-to-r from-[#FAF6F3] via-[#FAF6F3]/90 to-transparent" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 py-10 sm:py-12 lg:px-8">
          <div className="max-w-md lg:max-w-lg">
            <p className="eyebrow tracking-[0.25em] text-rose-deep font-medium">CRAFTED TO BE CHERISHED</p>
            <h2 className="mt-2 font-serif text-3xl sm:text-4xl text-ink leading-tight font-light">
              The Beauty Behind<br />
              <span className="italic">Every Detail</span>
            </h2>
            <span className="hairline mt-2.5 block w-12 bg-rose-light" />
            <p className="mt-4 text-xs sm:text-sm leading-relaxed text-ink-soft">
              At Prem by SHK, every piece tells a story of artistry, heritage, and intention. Thoughtfully crafted with an eye for detail, our designs are made to complement your most cherished moments and become part of your story.
            </p>

            </div>
        </div>
      </section>

      {/* PROMISES */}
      <section className="bg-cream-deep/40 py-12 border-y border-line/60">
        <div className="mx-auto flex flex-wrap items-stretch justify-center gap-6 px-4 max-w-3xl lg:px-8">
          {PROMISES.map((promise) => {
            const Icon = PROMISE_ICONS[promise.icon];
            return (
              <div
                key={promise.title}
                className="flex w-full sm:w-80 flex-col items-center rounded-lg border border-line/60 bg-cream/95 p-6 text-center transition hover:border-rose-light hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blush-soft text-rose-deep">
                  <Icon className="h-6 w-6" />
                </div>
                <p className="mt-3 font-serif text-sm font-medium text-ink">{promise.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {promise.body}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* NEW ARRIVALS */}
      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Just Landed</p>
            <h2 className="mt-2 font-serif text-4xl font-light text-ink">
              New This Season
            </h2>
            <span className="hairline mt-3 block w-16" />
          </div>
          <Link
            href="/shop?sort=newest"
            className="group flex items-center gap-2 text-[0.66rem] tracking-[0.22em] uppercase text-rose-deep"
          >
            View all new in
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-5 lg:grid-cols-4">
          {newArrivals.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="bg-blush-soft/70">
        <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
          <div className="text-center">
            <p className="eyebrow">Kind Words</p>
            <h2 className="mt-2 font-serif text-4xl font-light text-ink">
              Treasured by Our Clients
            </h2>
            <span className="hairline mx-auto mt-3 block w-16" />
          </div>
          <div className="mt-10">
            <Testimonials />
          </div>
        </div>
      </section>

      {/* JOURNAL */}
      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">The Journal</p>
            <h2 className="mt-2 font-serif text-4xl font-light text-ink">
              Inspiration &amp; Stories
            </h2>
            <span className="hairline mt-3 block w-16" />
          </div>
          <Link
            href="/about"
            className="group flex items-center gap-2 text-[0.66rem] tracking-[0.22em] uppercase text-rose-deep"
          >
            View all articles
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {JOURNAL.map((post) => (
            <article key={post.slug} className="group">
              <div className="aspect-[4/3] overflow-hidden rounded-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.image}
                  alt={post.title}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <p className="mt-4 text-[0.62rem] tracking-[0.2em] uppercase text-muted">
                {post.date}
              </p>
              <h3 className="mt-1 font-serif text-xl text-ink transition group-hover:text-rose-deep">
                {post.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                {post.excerpt}
              </p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
