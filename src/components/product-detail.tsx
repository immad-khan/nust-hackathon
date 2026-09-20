"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Product } from "@/db/schema";
import { useCart } from "@/components/cart-provider";
import { HeartIcon, GiftIcon, ReturnIcon } from "@/components/icons";
import { Stars } from "@/components/stars";
import { WhatsAppMark } from "@/components/whatsapp-mark";
import { formatPrice, formatRating, optimizeImageUrl } from "@/lib/format";
import { defaultProductMessage, whatsappLink } from "@/lib/whatsapp";
import { categoryLabel, productCategories } from "@/lib/categories";

export function ProductDetail({ product }: { product: Product }) {
  const router = useRouter();
  const { addItem, closeCart, toggleWishlist, isWishlisted } = useCart();
  const images = product.images.length > 0 ? product.images : ["https://images.pexels.com/photos/16038189/pexels-photo-16038189.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=900"];
  const [activeImage, setActiveImage] = useState(images[0]);
  const [variant, setVariant] = useState(product.colors[0] ?? "Gold");
  const [added, setAdded] = useState(false);
  const wished = isWishlisted(product.slug);

  const message = `${defaultProductMessage(product.name, product.slug)} Variant: ${variant}`;

  function handleAddToCart() {
    addItem({
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: activeImage,
      variant,
    }, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  function handleBuyNow() {
    addItem({
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: activeImage,
      variant,
    }, 1);
    closeCart();
    router.push("/checkout");
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 lg:grid-cols-2 lg:px-8">
      <div className="flex flex-col-reverse gap-4 sm:flex-row">
        <div className="no-scrollbar flex gap-3 overflow-x-auto sm:flex-col">
          {images.map((image) => (
            <button
              key={image}
              onClick={() => setActiveImage(image)}
              className={`h-24 w-20 shrink-0 overflow-hidden rounded-sm border transition ${
                activeImage === image
                  ? "border-rose-deep"
                  : "border-line hover:border-rose-light"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={optimizeImageUrl(image, 200)} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
        <div className="relative flex-1 overflow-hidden rounded-sm bg-blush-soft">
          <div className="aspect-[4/5] w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={optimizeImageUrl(activeImage, 800)}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          </div>
          {product.badge && (
            <span className="absolute top-4 left-4 rounded-sm bg-cream/90 px-3 py-1.5 text-[0.6rem] tracking-[0.2em] uppercase text-rose-deep">
              {product.badge}
            </span>
          )}
        </div>
      </div>

      <div className="lg:py-4">
        <nav className="flex flex-wrap items-center gap-x-1 text-[0.64rem] tracking-[0.16em] uppercase text-muted">
          <Link href="/" className="hover:text-rose-deep">
            Home
          </Link>
          {productCategories(product).map((slug) => (
            <span key={slug} className="flex items-center">
              <span className="px-2">/</span>
              <Link
                href={`/shop?category=${slug}`}
                className="hover:text-rose-deep"
              >
                {categoryLabel(slug)}
              </Link>
            </span>
          ))}
        </nav>

        <h1 className="mt-4 font-serif text-4xl leading-tight font-light text-ink">
          {product.name}
        </h1>

        <div className="mt-3 flex items-center gap-3">
          <Stars rating={product.rating} className="text-gold" />
          <span className="text-xs text-muted">
            {formatRating(product.rating)} · {product.reviewCount} reviews
          </span>
        </div>

        <div className="mt-5 flex items-baseline gap-3">
          <span className="font-serif text-3xl text-ink">
            {formatPrice(product.price)}
          </span>
          {product.compareAtPrice && (
            <>
              <span className="text-sm text-muted line-through">
                {formatPrice(product.compareAtPrice)}
              </span>
              <span className="rounded-sm bg-blush px-2 py-1 text-[0.6rem] tracking-[0.16em] uppercase text-rose-deep">
                Save {formatPrice(product.compareAtPrice - product.price)}
              </span>
            </>
          )}
        </div>

        {product.colors && product.colors.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[0.64rem] tracking-[0.18em] uppercase text-muted">Available Colors:</span>
            <span className="text-xs font-medium text-ink">
              {product.colors.join(" · ")}
            </span>
          </div>
        )}

        <p className="mt-5 text-sm leading-relaxed text-ink-soft">
          {product.description}
        </p>

        {product.colors.length > 0 && (
          <div className="mt-7">
            <p className="text-[0.66rem] tracking-[0.2em] uppercase text-muted">
              Finish — <span className="text-ink">{variant}</span>
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {product.colors.map((color) => (
                <button
                  key={color}
                  onClick={() => setVariant(color)}
                  className={`rounded-sm border px-4 py-2 text-[0.66rem] tracking-[0.14em] uppercase transition ${
                    variant === color
                      ? "border-rose-deep bg-rose-deep text-cream"
                      : "border-line bg-cream text-ink-soft hover:border-rose-light"
                  }`}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 space-y-3">
          {/* Primary Action Buttons: Buy Now + Add to Bag */}
          <div className="flex flex-col sm:flex-row items-stretch gap-3">
            <button
              onClick={handleBuyNow}
              disabled={product.stock <= 0}
              className="flex-1 rounded-sm bg-rose-deep px-8 py-4 text-center text-[0.7rem] font-semibold tracking-[0.24em] uppercase text-cream shadow-sm transition hover:bg-rose disabled:opacity-50 disabled:hover:bg-rose-deep cursor-pointer"
            >
              {product.stock <= 0 ? "Out of Stock" : "Buy Now"}
            </button>

            <button
              onClick={handleAddToCart}
              disabled={product.stock <= 0}
              className="flex-1 rounded-sm border border-line bg-cream px-8 py-4 text-center text-[0.7rem] font-medium tracking-[0.22em] uppercase text-ink transition hover:border-rose-light hover:bg-blush-soft disabled:opacity-50 cursor-pointer"
            >
              {added ? "Added to Bag ✓" : "Add to Bag"}
            </button>
          </div>

          {/* Secondary Actions: WhatsApp + Wishlist */}
          <div className="flex items-center gap-3">
            <a
              href={whatsappLink(message)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2.5 rounded-sm border border-[#25D366]/30 bg-[#25D366]/10 px-6 py-3.5 text-[0.66rem] tracking-[0.2em] uppercase text-emerald-800 transition hover:bg-[#25D366]/20"
            >
              <WhatsAppMark className="h-4 w-4 text-[#25D366]" />
              Order on WhatsApp
            </a>

            <button
              aria-label="Save to wishlist"
              onClick={() => toggleWishlist(product.slug)}
              className={`rounded-sm border border-line p-3.5 transition hover:border-rose-light ${
                wished ? "text-rose-deep bg-blush-soft/50" : "text-ink-soft bg-cream"
              }`}
            >
              <HeartIcon className="h-5 w-5" filled={wished} />
            </button>
          </div>
        </div>



        <div className="mt-6">
          <p className="eyebrow">The Details</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-soft">
            <li className="flex gap-2">
              <span className="text-rose-light">◆</span>
              {product.material}
            </li>
            {product.details.map((detail) => (
              <li key={detail} className="flex gap-2">
                <span className="text-rose-light">◆</span>
                {detail}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
