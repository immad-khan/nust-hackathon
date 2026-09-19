"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Category } from "@/db/schema";
import { CATEGORY_OPTIONS } from "@/lib/categories";

const SORTS = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
];

const PRICE_BANDS = [
  { label: "All prices", min: "", max: "" },
  { label: "Under Rs 2,500", min: "", max: "2500" },
  { label: "Rs 2,500 – 4,000", min: "2500", max: "4000" },
  { label: "Rs 4,000 +", min: "4000", max: "" },
];

export function ShopFilters({
  categories,
  total,
}: {
  categories: Category[];
  total: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const active = params.get("category") ?? "all";
  const sort = params.get("sort") ?? "featured";
  const min = params.get("min") ?? "";
  const max = params.get("max") ?? "";

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    Object.entries(patch).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    router.push(`/shop?${next.toString()}`);
  };

  const bandLabel =
    PRICE_BANDS.find((band) => band.min === min && band.max === max)?.label ??
    "All prices";

  const filterOptions = (() => {
    const list: { slug: string; name: string }[] = [{ slug: "all", name: "All Jewellery" }];
    const seen = new Set<string>();
    categories.forEach((c) => {
      list.push({ slug: c.slug, name: c.name });
      seen.add(c.slug);
    });
    CATEGORY_OPTIONS.forEach((c) => {
      if (!seen.has(c.slug)) {
        list.push({ slug: c.slug, name: c.name });
        seen.add(c.slug);
      }
    });
    return list;
  })();

  return (
    <div className="border-y border-line bg-blush-soft/40">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 lg:px-8">
        <div className="no-scrollbar flex max-w-full items-center gap-2 overflow-x-auto">
          {filterOptions.map((cat) => {
            const isActive = active === cat.slug;
            const search = new URLSearchParams(params.toString());
            if (cat.slug === "all") search.delete("category");
            else search.set("category", cat.slug);
            return (
              <Link
                key={cat.slug}
                href={`/shop?${search.toString()}`}
                className={`shrink-0 rounded-full border px-4 py-2 text-[0.64rem] tracking-[0.18em] uppercase transition ${
                  isActive
                    ? "border-rose-deep bg-rose-deep text-cream"
                    : "border-line bg-cream text-ink-soft hover:border-rose-light hover:text-rose-deep"
                }`}
              >
                {cat.name}
              </Link>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[0.64rem] tracking-[0.18em] uppercase text-muted">
            {total} pieces
          </span>
          <select
            value={bandLabel}
            onChange={(e) => {
              const band = PRICE_BANDS.find((b) => b.label === e.target.value);
              update({ min: band?.min ?? "", max: band?.max ?? "" });
            }}
            className="rounded-sm border border-line bg-cream px-3 py-2 text-[0.68rem] tracking-[0.1em] uppercase text-ink outline-none"
          >
            {PRICE_BANDS.map((band) => (
              <option key={band.label}>{band.label}</option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => update({ sort: e.target.value })}
            className="rounded-sm border border-line bg-cream px-3 py-2 text-[0.68rem] tracking-[0.1em] uppercase text-ink outline-none"
          >
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
