import Link from "next/link";
import type { Metadata } from "next";
import {
  FacebookIcon,
  InstagramIcon,
  PROMISE_ICONS,
  TikTokIcon,
} from "@/components/icons";
import { BRAND, JOURNAL, PROMISES } from "@/lib/content";

export const metadata: Metadata = {
  title: "Our Story — Prem by SHK",
  description:
    "The people, the craft and the promises behind Prem by SHK fine fashion jewellery.",
};

const SECTIONS = [
  {
    id: "shipping",
    title: "Shipping & Delivery",
    body: "Orders are hand-packed within 24 hours. Nationwide delivery takes 2–4 working days.",
  },
  {
    id: "returns",
    title: "Returns",
    body: "A piece can be returned if it is received defective and an image of the defective piece is shared as soon as possible on WhatsApp.",
  },
  {
    id: "care",
    title: "Jewellery Care",
    body: "Keep your pieces away from perfume and lotions. Treated well, our plating stays luminous for years.",
  },
  {
    id: "contact",
    title: "Contact Us",
    body: `Our client care team replies within one working day. Write to ${BRAND.email} or call ${BRAND.phone}.`,
  },
];

export default function AboutPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-r from-cream-deep via-blush-soft to-blush">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="eyebrow">Our Story</p>
            <h1 className="mt-3 font-serif text-5xl leading-tight font-light text-ink">
              Premium quality,
              <span className="block font-script text-5xl rose-gradient-text">
                exclusively for you
              </span>
            </h1>
            <span className="hairline mt-5 block w-20" />
            <p className="mt-6 max-w-lg text-sm leading-relaxed text-ink-soft">
              Prem by SHK began with a simple belief — that beautiful jewellery
              should be something you actually wear. Not saved for one night a
              year, but reached for every morning. We create thoughtfully
              designed pieces that bring effortless elegance to everyday
              moments, special occasions, and everything in between.
            </p>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink-soft">
              Working with skilled artisans and paying close attention to every
              detail, we create jewellery that reflects our love for timeless
              design, individuality, and everyday beauty. Each piece is
              carefully checked before it makes its way to you, because we
              believe quality should always be felt in the details.
            </p>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink-soft">
              Our collections are released in limited batches, allowing us to
              focus on thoughtful design and consistent quality while giving
              every piece a sense of individuality. Beautifully presented and
              ready to become part of your story.
            </p>
            <Link
              href="/shop"
              className="mt-8 inline-block rounded-sm bg-gradient-to-r from-rose-deep to-rose px-7 py-4 text-[0.68rem] tracking-[0.24em] uppercase text-cream"
            >
              Explore the collection
            </Link>
          </div>
          <div className="overflow-hidden rounded-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/story.jpg"
              alt="Prem by SHK Story"
              className="h-[420px] w-full object-cover object-center"
            />
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-cream">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-12 md:grid-cols-3 lg:grid-cols-5 lg:px-8">
          {PROMISES.map((promise) => {
            const Icon = PROMISE_ICONS[promise.icon];
            return (
              <div
                key={promise.title}
                className="flex flex-col items-center text-center"
              >
                <Icon className="h-7 w-7 text-rose" />
                <p className="mt-3 text-sm text-ink">{promise.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {promise.body}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2">
          {SECTIONS.map((section) => (
            <div key={section.id} id={section.id} className="scroll-mt-32">
              <h2 className="font-serif text-2xl text-ink">{section.title}</h2>
              <span className="hairline mt-3 block w-12" />
              <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                {section.body}
              </p>
              {section.id === "contact" && (
                <div className="mt-5 flex items-center gap-3">
                  <a
                    href={BRAND.instagram}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Instagram"
                    className="rounded-full border border-line bg-cream p-2.5 text-rose-deep transition hover:bg-rose-deep hover:text-cream"
                  >
                    <InstagramIcon className="h-4 w-4" />
                  </a>
                  <a
                    href={BRAND.facebook}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Facebook"
                    className="rounded-full border border-line bg-cream p-2.5 text-rose-deep transition hover:bg-rose-deep hover:text-cream"
                  >
                    <FacebookIcon className="h-4 w-4" />
                  </a>
                  <a
                    href={BRAND.tiktok}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="TikTok"
                    className="rounded-full border border-line bg-cream p-2.5 text-rose-deep transition hover:bg-rose-deep hover:text-cream"
                  >
                    <TikTokIcon className="h-4 w-4" />
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-blush-soft/60">
        <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
          <div className="text-center">
            <p className="eyebrow">The Journal</p>
            <h2 className="mt-2 font-serif text-4xl font-light text-ink">
              Inspiration &amp; Stories
            </h2>
            <span className="hairline mx-auto mt-3 block w-16" />
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
                <h3 className="mt-1 font-serif text-xl text-ink">{post.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {post.excerpt}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
