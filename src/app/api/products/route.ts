import { NextResponse } from "next/server";
import { getProducts, getProductsBySlugs } from "@/lib/queries";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=86400",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slugs = searchParams.get("slugs");

  if (slugs !== null) {
    const list = slugs.split(",").map((s) => s.trim()).filter(Boolean);
    const products = await getProductsBySlugs(list);
    return NextResponse.json({ products }, { headers: CACHE_HEADERS });
  }

  const products = await getProducts({
    category: searchParams.get("category") ?? undefined,
    sort: searchParams.get("sort") ?? undefined,
    q: searchParams.get("q") ?? undefined,
  });
  return NextResponse.json({ products }, { headers: CACHE_HEADERS });
}
