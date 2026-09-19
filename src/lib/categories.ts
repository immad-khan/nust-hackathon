export const CATEGORY_OPTIONS = [
  { slug: "earrings", name: "Earrings" },
  { slug: "cuffs", name: "Cuffs" },
  { slug: "rings", name: "Rings" },
  { slug: "bracelets", name: "Bracelets" },
  { slug: "necklaces", name: "Necklaces" },
  { slug: "sets", name: "Gift Sets" },
] as const;

export type CategorySlug = (typeof CATEGORY_OPTIONS)[number]["slug"];

export function productCategories(product: {
  categorySlug: string;
  categorySlugs?: string[] | null;
}): string[] {
  const extras = Array.isArray(product.categorySlugs)
    ? product.categorySlugs
    : [];
  return [...new Set([product.categorySlug, ...extras].filter(Boolean))];
}

export function categoryLabel(slug: string): string {
  return CATEGORY_OPTIONS.find((c) => c.slug === slug)?.name ?? slug;
}
