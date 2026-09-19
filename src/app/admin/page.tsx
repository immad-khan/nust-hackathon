"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CloseIcon } from "@/components/icons";
import { CATEGORY_OPTIONS, categoryLabel, productCategories } from "@/lib/categories";
import { AdminShell } from "@/components/admin-shell";

const TOKEN_KEY = "prem_admin_token";
const PASS_KEY = "prem_admin_password";

type AdminProduct = {
  id?: number;
  slug: string;
  name: string;
  categorySlug: string;
  categorySlugs?: string[];
  price: number;
  compareAtPrice?: number | null;
  shortDescription: string;
  description: string;
  material: string;
  images: string[];
  colors: string[];
  details: string[];
  rating: number;
  reviewCount: number;
  stock: number;
  badge?: string | null;
  isBestSeller: boolean;
  isNew: boolean;
};

function blankProduct(): AdminProduct {
  return {
    slug: "",
    name: "",
    categorySlug: "earrings",
    categorySlugs: ["earrings"],
    price: 0,
    compareAtPrice: null,
    shortDescription: "",
    description: "",
    material: "",
    images: [],
    colors: ["Gold"],
    details: [],
    rating: 50,
    reviewCount: 0,
    stock: 24,
    badge: null,
    isBestSeller: false,
    isNew: true,
  };
}

function normalizeProduct(product: Partial<AdminProduct>): AdminProduct {
  const base = blankProduct();
  const categorySlugs = productCategories({
    categorySlug: product.categorySlug || base.categorySlug,
    categorySlugs: product.categorySlugs ?? [product.categorySlug || base.categorySlug],
  });
  return {
    ...base,
    ...product,
    categorySlug: categorySlugs[0] || base.categorySlug,
    categorySlugs,
    images: Array.isArray(product.images) ? product.images : [],
    colors: Array.isArray(product.colors) ? product.colors : [],
    details: Array.isArray(product.details) ? product.details : [],
    rating: Number(product.rating ?? base.rating),
    reviewCount: Number(product.reviewCount ?? base.reviewCount),
    stock: Number(product.stock ?? base.stock),
    isBestSeller: Boolean(product.isBestSeller),
    isNew: Boolean(product.isNew),
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function listToText(values: string[]) {
  return values.join("\n");
}

function textToList(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function AdminPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [originalIdentifier, setOriginalIdentifier] = useState<string | number | null>(null);
  const [query, setQuery] = useState("");
  const [collectionFilter, setCollectionFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const authHeaders = (): Record<string, string> => {
    if (typeof window === "undefined") return {};
    const token = window.localStorage.getItem(TOKEN_KEY);
    const savedPassword = window.localStorage.getItem(PASS_KEY);
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(savedPassword ? { "x-admin-password": savedPassword } : {}),
    };
  };

  async function loadProducts() {
    setLoading(true);
    setNotice("");
    try {
      let res = await fetch("/api/admin/products", {
        cache: "no-store",
        credentials: "same-origin",
        headers: authHeaders(),
      });

      if (!res.ok) {
        res = await fetch("/api/products", { cache: "no-store" });
      }

      if (!res.ok) throw new Error("Could not load products");
      const data = (await res.json()) as { products?: Partial<AdminProduct>[] };
      setProducts((data.products ?? []).map(normalizeProduct));
    } catch {
      setNotice("Products could not be loaded. Tap Reload Products.");
    } finally {
      setLoading(false);
    }
  }

  /** Compress an image file to stay well under Vercel body limit */
  async function compressImage(file: File, maxBytes = 900_000): Promise<{ dataBase64: string; mimeType: string }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const MAX_DIM = 1500;
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) { height = Math.round((height * MAX_DIM) / width); width = MAX_DIM; }
          else { width = Math.round((width * MAX_DIM) / height); height = MAX_DIM; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.82;
        let dataUrl = canvas.toDataURL("image/jpeg", quality);
        while (dataUrl.length * 0.75 > maxBytes && quality > 0.4) {
          quality = Math.max(0.4, quality - 0.1);
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }
        const dataBase64 = dataUrl.split(",")[1] ?? "";
        resolve({ dataBase64, mimeType: "image/jpeg" });
      };
      img.onerror = () => reject(new Error("Could not read image"));
      img.src = objectUrl;
    });
  }

  async function uploadDngToCloudinary(file: File): Promise<string> {
    const signRes = await fetch("/api/admin/cloudinary-sign", {
      credentials: "same-origin",
      headers: authHeaders(),
    });
    if (!signRes.ok) throw new Error("Could not get upload signature");
    const { cloudName, apiKey, timestamp, signature } = (await signRes.json()) as {
      cloudName: string; apiKey: string; timestamp: number; signature: string;
    };

    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", apiKey);
    formData.append("timestamp", String(timestamp));
    formData.append("signature", signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Cloudinary upload failed");
    const json = (await res.json()) as { secure_url?: string };
    if (!json.secure_url) throw new Error("Cloudinary did not return a URL");
    return json.secure_url;
  }

  const DNG_TYPES = new Set(["image/x-adobe-dng", "image/dng"]);

  async function uploadImage(file: File) {
    if (!editing) return;
    setUploading(true);
    try {
      let imageUrl: string;

      if (DNG_TYPES.has(file.type) || file.name.toLowerCase().endsWith(".dng")) {
        imageUrl = await uploadDngToCloudinary(file);
      } else {
        const { dataBase64, mimeType } = await compressImage(file);
        const res = await fetch("/api/admin/uploads", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ fileName: file.name, mimeType, dataBase64 }),
        });
        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !data.url) throw new Error(data.error || "upload failed");
        imageUrl = data.url;
      }

      setEditing((prev) =>
        prev ? { ...prev, images: [...prev.images, imageUrl] } : prev,
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function saveProduct() {
    if (!editing) return;
    const categories = productCategories(editing);
    const payload: AdminProduct = {
      ...editing,
      slug: slugify(editing.slug || editing.name),
      categorySlug: categories[0] || "earrings",
      categorySlugs: categories.length ? categories : ["earrings"],
      price: Number(editing.price) || 0,
      compareAtPrice: editing.compareAtPrice ? Number(editing.compareAtPrice) : null,
      rating: Number(editing.rating) || 50,
      reviewCount: Number(editing.reviewCount) || 0,
      stock: Number(editing.stock) || 0,
    };

    if (!payload.name || !payload.slug || payload.price <= 0) {
      alert("Name, slug and price are required.");
      return;
    }

    setLoading(true);
    try {
      const targetIdentifier = originalIdentifier ?? payload.id ?? payload.slug;
      const res = originalIdentifier !== null
        ? await fetch(`/api/admin/products/${targetIdentifier}`, {
            method: "PUT",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/products", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify(payload),
          });
      const data = (await res.json()) as { product?: AdminProduct; error?: string };
      if (!res.ok) throw new Error(data.error || "Save failed");
      setEditing(null);
      setOriginalIdentifier(null);
      await loadProducts();
      setNotice("Product saved successfully.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteProduct(product: AdminProduct) {
    const targetIdentifier = product.id ?? product.slug;
    if (!targetIdentifier) return;
    if (!confirm(`Delete ${product.name}? This cannot be undone.`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${targetIdentifier}`, {
        method: "DELETE",
        credentials: "same-origin",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Delete failed");
      await loadProducts();
      setNotice("Product deleted.");
    } catch {
      alert("Delete failed.");
    } finally {
      setLoading(false);
    }
  }

  function openEditor(product?: AdminProduct) {
    if (product) {
      setOriginalIdentifier(product.id ?? product.slug);
      setEditing(normalizeProduct(product));
    } else {
      setOriginalIdentifier(null);
      setEditing(blankProduct());
    }
  }

  function updateEditing(patch: Partial<AdminProduct>) {
    setEditing((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function toggleCollection(slug: string) {
    if (!editing) return;
    const current = productCategories(editing);
    const next = current.includes(slug)
      ? current.filter((item) => item !== slug)
      : [...current, slug];
    if (next.length === 0) return;
    updateEditing({ categorySlug: next[0], categorySlugs: next });
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((product) => {
      const textMatch =
        !q ||
        product.name.toLowerCase().includes(q) ||
        product.slug.toLowerCase().includes(q) ||
        product.shortDescription.toLowerCase().includes(q);
      const collectionMatch =
        collectionFilter === "all" ||
        productCategories(product).includes(collectionFilter);
      return textMatch && collectionMatch;
    });
  }, [products, query, collectionFilter]);

  return (
    <AdminShell
      eyebrow="Studio CRM"
      title="Product Catalog"
      description="Manage listed products, pricing, photos, collections, variants, stock and display flags."
      actions={
        <>
          <button
            onClick={() => void loadProducts()}
            className="rounded-sm border border-line bg-cream px-4 py-2 text-[0.62rem] tracking-[0.16em] uppercase text-ink transition hover:bg-blush-soft"
          >
            ↻ Reload
          </button>
          <button
            onClick={() => openEditor()}
            className="rounded-sm bg-rose-deep px-4 py-2 text-[0.62rem] tracking-[0.16em] uppercase text-cream transition hover:bg-rose"
          >
            + Add Product
          </button>
        </>
      }
    >
      <div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-sm border border-line bg-cream p-5 shadow-xs">
                <p className="text-[0.62rem] tracking-[0.18em] uppercase text-muted font-medium">Total Listed</p>
                <p className="mt-1 font-serif text-3xl text-ink">{products.length}</p>
                <p className="mt-1 text-xs text-ink-soft">Active in store catalog</p>
              </div>
              <div className="rounded-sm border border-line bg-cream p-5 shadow-xs">
                <p className="text-[0.62rem] tracking-[0.18em] uppercase text-muted font-medium">Best Sellers</p>
                <p className="mt-1 font-serif text-3xl text-rose-deep">{products.filter((p) => p.isBestSeller).length}</p>
                <p className="mt-1 text-xs text-ink-soft">Featured on homepage</p>
              </div>
              <div className="rounded-sm border border-line bg-cream p-5 shadow-xs">
                <p className="text-[0.62rem] tracking-[0.18em] uppercase text-muted font-medium">New Pieces</p>
                <p className="mt-1 font-serif text-3xl text-gold">{products.filter((p) => p.isNew).length}</p>
                <p className="mt-1 text-xs text-ink-soft">Recent studio creations</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-[1fr_220px]">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products by name, slug, description…"
                className="rounded-sm border border-line bg-cream px-4 py-2.5 text-sm text-ink outline-none focus:border-rose"
              />
              <select
                value={collectionFilter}
                onChange={(e) => setCollectionFilter(e.target.value)}
                className="rounded-sm border border-line bg-cream px-4 py-2.5 text-sm text-ink outline-none focus:border-rose"
              >
                <option value="all">All collections</option>
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat.slug} value={cat.slug}>{cat.name}</option>
                ))}
              </select>
            </div>

            {notice && <p className="mt-4 rounded-sm border border-line bg-blush-soft/50 px-4 py-3 text-sm text-rose-deep">{notice}</p>}
            {loading && <p className="mt-4 text-sm text-muted">Loading products…</p>}

            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              {filtered.map((product) => (
                <article key={product.id ?? product.slug} className="rounded-sm border border-line bg-cream p-4 shadow-sm">
                  <div className="flex gap-4">
                    {product.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.images[0]} alt="" className="h-28 w-24 shrink-0 rounded-sm object-cover" />
                    ) : (
                      <div className="h-28 w-24 shrink-0 rounded-sm bg-blush-soft flex items-center justify-center text-xl">💎</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="font-serif text-xl leading-tight text-ink">{product.name}</h2>
                          <p className="mt-1 break-all text-xs text-muted">/{product.slug}</p>
                        </div>
                        <p className="font-serif text-xl text-ink">Rs {product.price.toLocaleString()}</p>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-soft">{product.shortDescription || product.description}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {productCategories(product).map((slug) => (
                          <span key={slug} className="rounded-full bg-blush-soft px-3 py-1 text-[0.58rem] tracking-[0.16em] uppercase text-rose-deep">
                            {categoryLabel(slug)}
                          </span>
                        ))}
                        {product.colors && product.colors.map((c) => (
                          <span key={c} className="rounded-full border border-line bg-cream px-3 py-1 text-[0.58rem] tracking-[0.16em] uppercase text-ink-soft">
                            🎨 {c}
                          </span>
                        ))}
                        {product.isNew && <span className="rounded-full bg-cream-deep px-3 py-1 text-[0.58rem] tracking-[0.16em] uppercase text-rose-deep">New</span>}
                        {product.isBestSeller && <span className="rounded-full bg-cream-deep px-3 py-1 text-[0.58rem] tracking-[0.16em] uppercase text-rose-deep">Bestseller</span>}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button onClick={() => openEditor(product)} className="rounded-sm border border-rose-deep py-2.5 text-[0.64rem] tracking-[0.18em] uppercase text-rose-deep transition hover:bg-blush-soft">
                      Edit Everything
                    </button>
                    <button onClick={() => void deleteProduct(product)} className="rounded-sm border border-line py-2.5 text-[0.64rem] tracking-[0.18em] uppercase text-muted transition hover:bg-blush-soft hover:text-rose-deep">
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {!loading && filtered.length === 0 && (
              <div className="mt-8 rounded-sm border border-line bg-blush-soft/40 p-10 text-center">
                <h2 className="font-serif text-2xl text-ink">No products shown</h2>
                <p className="mt-2 text-sm text-muted">Clear search/filter or tap Reload Products.</p>
                <button onClick={() => void loadProducts()} className="mt-5 rounded-sm bg-rose-deep px-6 py-3 text-[0.68rem] tracking-[0.2em] uppercase text-cream">
                  Reload Products
                </button>
              </div>
            )}

            {editing && (
              <div className="fixed inset-0 z-[80] overflow-y-auto bg-ink/60 p-0 backdrop-blur-sm sm:p-4">
                <div className="mx-auto min-h-full max-w-4xl bg-cream p-5 shadow-2xl sm:min-h-0 sm:rounded-sm sm:p-8">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="eyebrow">Product Editor</p>
                      <h2 className="mt-1 font-serif text-3xl text-ink">{editing.id ? "Edit Product" : "Add New Product"}</h2>
                    </div>
                    <button onClick={() => setEditing(null)} aria-label="Close editor" className="rounded-full border border-line p-2 text-ink hover:text-rose">
                      <CloseIcon className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="mt-6 grid gap-5 md:grid-cols-2">
                    <label className="block">
                      <span className="text-[0.66rem] tracking-[0.18em] uppercase text-muted">Product Name *</span>
                      <input value={editing.name} onChange={(e) => updateEditing({ name: e.target.value, slug: editing.id ? editing.slug : slugify(e.target.value) })} className="mt-2 w-full border-b border-line bg-transparent py-2 text-sm outline-none focus:border-rose" />
                    </label>
                    <label className="block">
                      <span className="text-[0.66rem] tracking-[0.18em] uppercase text-muted">Slug *</span>
                      <input value={editing.slug} onChange={(e) => updateEditing({ slug: slugify(e.target.value) })} className="mt-2 w-full border-b border-line bg-transparent py-2 text-sm outline-none focus:border-rose" />
                    </label>
                    <label className="block">
                      <span className="text-[0.66rem] tracking-[0.18em] uppercase text-muted">Price (Rs) *</span>
                      <input type="number" value={editing.price || ""} onChange={(e) => updateEditing({ price: Number(e.target.value) || 0 })} className="mt-2 w-full border-b border-line bg-transparent py-2 text-sm outline-none focus:border-rose" />
                    </label>
                    <label className="block">
                      <span className="text-[0.66rem] tracking-[0.18em] uppercase text-muted">Sale/Compare Price</span>
                      <input type="number" value={editing.compareAtPrice ?? ""} onChange={(e) => updateEditing({ compareAtPrice: Number(e.target.value) || null })} className="mt-2 w-full border-b border-line bg-transparent py-2 text-sm outline-none focus:border-rose" />
                    </label>
                    <label className="block">
                      <span className="text-[0.66rem] tracking-[0.18em] uppercase text-muted">Stock</span>
                      <input type="number" value={editing.stock} onChange={(e) => updateEditing({ stock: Number(e.target.value) || 0 })} className="mt-2 w-full border-b border-line bg-transparent py-2 text-sm outline-none focus:border-rose" />
                    </label>
                    <label className="block">
                      <span className="text-[0.66rem] tracking-[0.18em] uppercase text-muted">Badge</span>
                      <input value={editing.badge ?? ""} onChange={(e) => updateEditing({ badge: e.target.value || null })} placeholder="Bestseller, Gift Ready, New…" className="mt-2 w-full border-b border-line bg-transparent py-2 text-sm outline-none focus:border-rose" />
                    </label>
                    <label className="block">
                      <span className="text-[0.66rem] tracking-[0.18em] uppercase text-muted">Rating 0–50</span>
                      <input type="number" min={0} max={50} value={editing.rating} onChange={(e) => updateEditing({ rating: Number(e.target.value) || 0 })} className="mt-2 w-full border-b border-line bg-transparent py-2 text-sm outline-none focus:border-rose" />
                    </label>
                    <label className="block">
                      <span className="text-[0.66rem] tracking-[0.18em] uppercase text-muted">Review Count</span>
                      <input type="number" min={0} value={editing.reviewCount} onChange={(e) => updateEditing({ reviewCount: Number(e.target.value) || 0 })} className="mt-2 w-full border-b border-line bg-transparent py-2 text-sm outline-none focus:border-rose" />
                    </label>
                  </div>

                  <div className="mt-6">
                    <p className="text-[0.66rem] tracking-[0.18em] uppercase text-muted">Collections / Categories *</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                      {CATEGORY_OPTIONS.map((cat) => {
                        const selected = productCategories(editing).includes(cat.slug);
                        return (
                          <button key={cat.slug} type="button" onClick={() => toggleCollection(cat.slug)} className={`rounded-sm border px-3 py-2 text-[0.62rem] tracking-[0.14em] uppercase transition ${selected ? "border-rose-deep bg-rose-deep text-cream" : "border-line bg-cream text-ink-soft hover:border-rose-light"}`}>
                            {cat.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <label className="mt-6 block">
                    <span className="text-[0.66rem] tracking-[0.18em] uppercase text-muted">Short Description</span>
                    <input value={editing.shortDescription} onChange={(e) => updateEditing({ shortDescription: e.target.value })} className="mt-2 w-full border-b border-line bg-transparent py-2 text-sm outline-none focus:border-rose" />
                  </label>

                  <label className="mt-6 block">
                    <span className="text-[0.66rem] tracking-[0.18em] uppercase text-muted">Full Description</span>
                    <textarea rows={5} value={editing.description} onChange={(e) => updateEditing({ description: e.target.value })} className="mt-2 w-full rounded-sm border border-line bg-transparent p-3 text-sm outline-none focus:border-rose" />
                  </label>

                  <label className="mt-6 block">
                    <span className="text-[0.66rem] tracking-[0.18em] uppercase text-muted">Material</span>
                    <input value={editing.material} onChange={(e) => updateEditing({ material: e.target.value })} className="mt-2 w-full border-b border-line bg-transparent py-2 text-sm outline-none focus:border-rose" />
                  </label>

                  <div className="mt-6 grid gap-5 md:grid-cols-2">
                    <label className="block">
                      <span className="text-[0.66rem] tracking-[0.18em] uppercase text-muted">Variants / Colours — one per line</span>
                      <textarea rows={4} defaultValue={listToText(editing.colors)} key={`colors-${editing.id ?? editing.slug}`} onBlur={(e) => updateEditing({ colors: textToList(e.target.value) })} className="mt-2 w-full rounded-sm border border-line bg-transparent p-3 text-sm outline-none focus:border-rose" />
                    </label>
                    <label className="block">
                      <span className="text-[0.66rem] tracking-[0.18em] uppercase text-muted">Product Details — one per line</span>
                      <textarea rows={4} defaultValue={listToText(editing.details)} key={`details-${editing.id ?? editing.slug}`} onBlur={(e) => updateEditing({ details: textToList(e.target.value) })} className="mt-2 w-full rounded-sm border border-line bg-transparent p-3 text-sm outline-none focus:border-rose" />
                    </label>
                  </div>

                  <div className="mt-6">
                    <p className="text-[0.66rem] tracking-[0.18em] uppercase text-muted">Images</p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      {editing.images.map((image, index) => (
                        <div key={`${image}-${index}`} className="relative h-24 w-24 overflow-hidden rounded-sm border border-line bg-blush-soft">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={image} alt="" className="h-full w-full object-cover" />
                          <button type="button" onClick={() => updateEditing({ images: editing.images.filter((_, i) => i !== index) })} className="absolute right-1 top-1 rounded-full bg-rose-deep px-2 py-0.5 text-[0.58rem] text-cream">×</button>
                        </div>
                      ))}
                      <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-sm border border-dashed border-rose-light text-center text-xs text-rose-deep hover:bg-blush-soft">
                        {uploading ? "Uploading…" : "+ Upload"}
                        <input type="file" accept="image/jpeg,image/png,image/webp,image/x-adobe-dng,image/dng,.dng" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadImage(file); e.target.value = ""; }} />
                      </label>
                    </div>
                    <label className="mt-4 block">
                      <span className="text-[0.66rem] tracking-[0.18em] uppercase text-muted">Image URLs — one per line</span>
                      <textarea rows={3} value={listToText(editing.images.filter((url) => !url.startsWith("/api/admin/uploads")))} onChange={(e) => { const uploads = editing.images.filter((url) => url.startsWith("/api/admin/uploads")); updateEditing({ images: [...uploads, ...textToList(e.target.value)] }); }} className="mt-2 w-full rounded-sm border border-line bg-transparent p-3 text-sm outline-none focus:border-rose" />
                    </label>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-6">
                    <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" checked={editing.isNew} onChange={(e) => updateEditing({ isNew: e.target.checked })} /> Mark as New</label>
                    <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" checked={editing.isBestSeller} onChange={(e) => updateEditing({ isBestSeller: e.target.checked })} /> Mark as Bestseller</label>
                  </div>

                  <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button onClick={() => setEditing(null)} className="rounded-sm border border-line px-6 py-3 text-[0.68rem] tracking-[0.18em] uppercase text-ink">Cancel</button>
                    <button onClick={() => void saveProduct()} disabled={loading || !editing.name || !editing.slug || editing.price <= 0} className="rounded-sm bg-rose-deep px-6 py-3 text-[0.68rem] tracking-[0.18em] uppercase text-cream disabled:opacity-50">{loading ? "Saving…" : "Save Product"}</button>
                  </div>
                </div>
              </div>
            )}
          </div>
    </AdminShell>
  );
}
