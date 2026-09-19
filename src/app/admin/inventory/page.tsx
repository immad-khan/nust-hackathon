"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminShell, getAdminAuthHeaders } from "@/components/admin-shell";
import { SearchIcon } from "@/components/icons";

type ProductInventoryItem = {
  id?: number;
  slug: string;
  name: string;
  categorySlug: string;
  categorySlugs?: string[];
  price: number;
  stock: number;
  images: string[];
  createdAt?: string;
  updatedAt?: string;
};

function formatCurrency(amount: number) {
  return `Rs ${Number(amount || 0).toLocaleString()}`;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "Sep 19, 2026";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "Sep 19, 2026";
  }
}

function generateSku(item: ProductInventoryItem): string {
  const prefix = (item.categorySlug || "JW").slice(0, 3).toUpperCase();
  const idPart = item.id ? String(item.id).padStart(3, "0") : item.slug.slice(0, 4).toUpperCase();
  return `SHK-${prefix}-${idPart}`;
}

function getStockBadge(stock: number) {
  const count = Number(stock) || 0;
  if (count < 10) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-700 border border-red-500/20">
        <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        {count} units (Low)
      </span>
    );
  }
  if (count >= 10 && count <= 20) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-500/20">
        <span className="h-2 w-2 rounded-full bg-amber-500" />
        {count} units (Medium)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-500/20">
      <span className="h-2 w-2 rounded-full bg-emerald-500" />
      {count} units (Healthy)
    </span>
  );
}

export default function AdminInventoryPage() {
  const [items, setItems] = useState<ProductInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "medium" | "healthy" | "out">("all");
  const [updatingId, setUpdatingId] = useState<string | number | null>(null);
  const [notice, setNotice] = useState("");

  async function loadInventory() {
    setLoading(true);
    setNotice("");
    try {
      const res = await fetch("/api/admin/inventory", {
        cache: "no-store",
        headers: getAdminAuthHeaders(),
      });
      if (!res.ok) throw new Error("Could not load inventory");
      const data = (await res.json()) as { products?: ProductInventoryItem[] };
      setItems(data.products ?? []);
    } catch {
      setNotice("Failed to fetch inventory from Supabase.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadInventory();
  }, []);

  async function updateStock(
    item: ProductInventoryItem,
    newStock: number
  ) {
    const targetKey = item.id ?? item.slug;
    setUpdatingId(targetKey);
    const validStock = Math.max(0, newStock);
    try {
      const res = await fetch("/api/admin/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAdminAuthHeaders() },
        body: JSON.stringify({
          id: item.id,
          slug: item.slug,
          stock: validStock,
        }),
      });
      if (!res.ok) throw new Error("Failed to update stock");
      setItems((prev) =>
        prev.map((i) =>
          (i.id && i.id === item.id) || i.slug === item.slug
            ? { ...i, stock: validStock }
            : i
        )
      );
    } catch {
      alert("Could not update stock level");
    } finally {
      setUpdatingId(null);
    }
  }

  const enrichedItems = useMemo(() => {
    return items.map((item) => ({
      ...item,
      sku: generateSku(item),
      productId: item.id ? `#${item.id}` : `PRD-${item.slug.slice(0, 5).toUpperCase()}`,
    }));
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return enrichedItems.filter((item) => {
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.slug.toLowerCase().includes(q) ||
        item.productId.toLowerCase().includes(q);

      const count = Number(item.stock) || 0;
      let matchStock = true;
      if (stockFilter === "low") {
        matchStock = count > 0 && count < 10;
      } else if (stockFilter === "medium") {
        matchStock = count >= 10 && count <= 20;
      } else if (stockFilter === "healthy") {
        matchStock = count > 20;
      } else if (stockFilter === "out") {
        matchStock = count === 0;
      }

      return matchSearch && matchStock;
    });
  }, [enrichedItems, query, stockFilter]);

  const metrics = useMemo(() => {
    const totalProducts = items.length;
    const totalStock = items.reduce((sum, i) => sum + (Number(i.stock) || 0), 0);
    const lowStock = items.filter((i) => (Number(i.stock) || 0) < 10).length;
    const healthyStock = items.filter((i) => (Number(i.stock) || 0) > 20).length;
    return { totalProducts, totalStock, lowStock, healthyStock };
  }, [items]);

  return (
    <AdminShell
      eyebrow="Inventory Management"
      title="Stock & SKU Directory"
      description="Track product inventory levels, SKUs, pricing and stock alerts directly synced with Supabase Postgres."
      actions={
        <Link
          href="/admin"
          className="rounded-sm bg-rose-deep px-4 py-2 text-[0.62rem] tracking-[0.16em] uppercase text-cream hover:bg-rose transition"
        >
          + Manage Products
        </Link>
      }
    >
      <div>
        {/* Summary Metrics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-sm border border-line bg-cream p-5 shadow-xs">
            <p className="text-[0.62rem] font-medium tracking-[0.18em] uppercase text-muted">Total Products</p>
            <p className="mt-2 font-serif text-3xl text-ink">{loading ? "…" : metrics.totalProducts}</p>
            <p className="mt-1 text-xs text-ink-soft">Active listed SKUs</p>
          </div>

          <div className="rounded-sm border border-line bg-cream p-5 shadow-xs">
            <p className="text-[0.62rem] font-medium tracking-[0.18em] uppercase text-muted">Total Units in Stock</p>
            <p className="mt-2 font-serif text-3xl text-ink">{loading ? "…" : metrics.totalStock.toLocaleString()}</p>
            <p className="mt-1 text-xs text-ink-soft">Across all collections</p>
          </div>

          <div className="rounded-sm border border-line bg-cream p-5 shadow-xs">
            <p className="text-[0.62rem] font-medium tracking-[0.18em] uppercase text-muted">Low Stock (&lt; 10)</p>
            <p className="mt-2 font-serif text-3xl text-red-600">{loading ? "…" : metrics.lowStock}</p>
            <p className="mt-1 text-xs text-red-700/80">Reorder recommended</p>
          </div>

          <div className="rounded-sm border border-line bg-cream p-5 shadow-xs">
            <p className="text-[0.62rem] font-medium tracking-[0.18em] uppercase text-muted">Healthy Stock (&gt; 20)</p>
            <p className="mt-2 font-serif text-3xl text-emerald-600">{loading ? "…" : metrics.healthyStock}</p>
            <p className="mt-1 text-xs text-emerald-700/80">Sufficient supply</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mt-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-lg">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by Product Name or SKU…"
              className="w-full rounded-sm border border-line bg-cream pl-10 pr-4 py-2.5 text-sm text-ink outline-none focus:border-rose transition"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink text-xs"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <span className="text-[0.62rem] uppercase tracking-[0.18em] text-muted shrink-0">Level:</span>
            {[
              { key: "all", label: "All Items" },
              { key: "low", label: "Low (<10)" },
              { key: "medium", label: "Medium (10-20)" },
              { key: "healthy", label: "Healthy (>20)" },
              { key: "out", label: "Out of Stock" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStockFilter(tab.key as typeof stockFilter)}
                className={`shrink-0 rounded-sm px-3 py-1.5 text-[0.62rem] tracking-[0.16em] uppercase transition ${
                  stockFilter === tab.key
                    ? "bg-rose-deep text-cream font-medium"
                    : "border border-line bg-cream text-ink-soft hover:border-rose-light hover:bg-blush-soft"
                }`}
              >
                {tab.label}
              </button>
            ))}
            <button
              onClick={() => void loadInventory()}
              className="shrink-0 rounded-sm border border-line bg-cream px-3 py-1.5 text-[0.62rem] tracking-[0.16em] uppercase text-ink hover:bg-blush-soft"
              title="Refresh Inventory"
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {notice && (
          <div className="mt-4 rounded-sm border border-line bg-blush-soft/60 px-4 py-3 text-sm text-rose-deep flex items-center justify-between">
            <span>{notice}</span>
            <button onClick={() => setNotice("")} className="text-rose-deep hover:underline text-xs">Dismiss</button>
          </div>
        )}

        {/* Inventory Table */}
        <div className="mt-6 rounded-sm border border-line bg-cream shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div className="h-4 w-32 bg-blush-soft animate-pulse rounded" />
                <div className="h-4 w-36 bg-blush-soft animate-pulse rounded" />
              </div>
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <div key={idx} className="flex items-center justify-between py-3 border-b border-line/40 gap-4">
                  <div className="h-10 w-10 bg-blush-soft animate-pulse rounded shrink-0" />
                  <div className="h-4 w-40 bg-blush-soft animate-pulse rounded" />
                  <div className="h-4 w-20 bg-blush-soft animate-pulse rounded" />
                  <div className="h-4 w-28 bg-blush-soft animate-pulse rounded" />
                  <div className="h-6 w-24 bg-blush-soft animate-pulse rounded-full" />
                  <div className="h-4 w-20 bg-blush-soft animate-pulse rounded" />
                  <div className="h-4 w-24 bg-blush-soft animate-pulse rounded" />
                </div>
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-16 px-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blush-soft text-2xl">
                📊
              </div>
              <h3 className="mt-4 font-serif text-2xl text-ink">No Inventory Found</h3>
              <p className="mt-1.5 text-sm text-ink-soft max-w-md mx-auto">
                {query || stockFilter !== "all"
                  ? "No products match your current search or stock filter. Try adjusting your query."
                  : "No products currently exist in your Supabase database table."}
              </p>
              <div className="mt-5 flex justify-center gap-3">
                {(query || stockFilter !== "all") && (
                  <button
                    onClick={() => {
                      setQuery("");
                      setStockFilter("all");
                    }}
                    className="rounded-sm border border-line px-5 py-2 text-[0.65rem] tracking-[0.18em] uppercase text-ink hover:bg-blush-soft transition"
                  >
                    Clear Filters
                  </button>
                )}
                <Link
                  href="/admin"
                  className="rounded-sm bg-rose-deep px-5 py-2 text-[0.65rem] tracking-[0.18em] uppercase text-cream hover:bg-rose transition"
                >
                  + Add New Product
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-cream-deep/60 text-[0.62rem] uppercase tracking-[0.16em] text-muted">
                  <tr>
                    <th className="px-5 py-3.5 font-medium">Product Name</th>
                    <th className="px-5 py-3.5 font-medium">Product ID</th>
                    <th className="px-5 py-3.5 font-medium">SKU</th>
                    <th className="px-5 py-3.5 font-medium">Stock Count</th>
                    <th className="px-5 py-3.5 font-medium">Price</th>
                    <th className="px-5 py-3.5 font-medium">Last Updated</th>
                    <th className="px-5 py-3.5 font-medium text-right">Quick Stock Adjust</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {filteredItems.map((item) => {
                    const isUpdating = updatingId === (item.id ?? item.slug);
                    return (
                      <tr
                        key={item.slug}
                        className="transition hover:bg-blush-soft/30 group"
                      >
                        <td className="px-5 py-4 min-w-[240px]">
                          <div className="flex items-center gap-3">
                            {item.images && item.images[0] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.images[0]}
                                alt=""
                                className="h-11 w-11 shrink-0 rounded-sm object-cover border border-line"
                              />
                            ) : (
                              <div className="h-11 w-11 shrink-0 rounded-sm bg-blush-soft flex items-center justify-center text-sm">
                                💎
                              </div>
                            )}
                            <div className="min-w-0">
                              <Link
                                href={`/product/${item.slug}`}
                                target="_blank"
                                className="font-medium text-ink hover:text-rose-deep hover:underline transition truncate block max-w-[220px]"
                              >
                                {item.name}
                              </Link>
                              <span className="text-[0.65rem] text-muted uppercase tracking-wider">
                                {item.categorySlug || "Jewellery"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 font-mono text-xs text-muted whitespace-nowrap">
                          {item.productId}
                        </td>

                        <td className="px-5 py-4 font-mono text-xs font-semibold text-ink whitespace-nowrap">
                          {item.sku}
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          {getStockBadge(item.stock)}
                        </td>

                        <td className="px-5 py-4 font-serif text-base font-semibold text-ink whitespace-nowrap">
                          {formatCurrency(item.price)}
                        </td>

                        <td className="px-5 py-4 text-xs text-ink-soft whitespace-nowrap">
                          {formatDate(item.updatedAt || item.createdAt)}
                        </td>

                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 border border-line rounded-sm bg-cream p-0.5">
                            <button
                              type="button"
                              disabled={isUpdating || item.stock <= 0}
                              onClick={() => void updateStock(item, item.stock - 1)}
                              className="h-7 w-7 flex items-center justify-center text-sm font-semibold rounded-sm text-ink-soft hover:bg-blush-soft disabled:opacity-30 transition"
                              title="Decrease stock by 1"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={0}
                              value={item.stock}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                if (!isNaN(val)) {
                                  void updateStock(item, val);
                                }
                              }}
                              className="w-12 text-center text-xs font-mono font-semibold py-1 bg-transparent outline-none focus:bg-blush-soft rounded-xs"
                            />
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => void updateStock(item, item.stock + 1)}
                              className="h-7 w-7 flex items-center justify-center text-sm font-semibold rounded-sm text-ink-soft hover:bg-blush-soft transition"
                              title="Increase stock by 1"
                            >
                              +
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
