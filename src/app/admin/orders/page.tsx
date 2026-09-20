"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShell, getAdminAuthHeaders } from "@/components/admin-shell";
import { SearchIcon, CloseIcon } from "@/components/icons";

type OrderItem = {
  id: number;
  orderNumber: string;
  productSlug: string;
  name: string;
  variant: string;
  image: string;
  unitPrice: number;
  quantity: number;
};

type Order = {
  id: number;
  orderNumber: string;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  note: string;
  subtotal: number;
  shipping: number;
  total: number;
  status: string;
  adminSeen?: boolean;
  createdAt: string;
  items: OrderItem[];
};

function formatDate(dateStr: string) {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatCurrency(amount: number) {
  return `Rs ${Number(amount || 0).toLocaleString()}`;
}

function getStatusBadge(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "completed" || s === "delivered" || s === "confirmed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[0.65rem] font-medium tracking-wider uppercase text-emerald-700 border border-emerald-500/20">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        {status || "Completed"}
      </span>
    );
  }
  if (s === "pending" || s === "awaiting") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-[0.65rem] font-medium tracking-wider uppercase text-amber-700 border border-amber-500/20">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        {status || "Pending"}
      </span>
    );
  }
  if (s === "cancelled" || s === "canceled" || s === "failed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-1 text-[0.65rem] font-medium tracking-wider uppercase text-rose-700 border border-rose-500/20">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        {status || "Cancelled"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 px-2.5 py-1 text-[0.65rem] font-medium tracking-wider uppercase text-sky-700 border border-sky-500/20">
      <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
      {status || "Processing"}
    </span>
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  async function loadOrders() {
    setLoading(true);
    setNotice("");
    try {
      const res = await fetch("/api/admin/orders", {
        cache: "no-store",
        headers: getAdminAuthHeaders(),
      });
      if (!res.ok) throw new Error("Could not load orders");
      const data = (await res.json()) as { orders?: Order[] };
      setOrders(data.orders ?? []);
    } catch {
      setNotice("Failed to fetch orders from database.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();
  }, []);

  async function updateStatus(orderNumber: string, nextStatus: string) {
    setUpdatingStatus(orderNumber);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAdminAuthHeaders() },
        body: JSON.stringify({ orderNumber, status: nextStatus }),
      });
      if (!res.ok) throw new Error("Status update failed");
      setOrders((prev) =>
        prev.map((o) => (o.orderNumber === orderNumber ? { ...o, status: nextStatus } : o))
      );
      if (selectedOrder && selectedOrder.orderNumber === orderNumber) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: nextStatus } : null));
      }
    } catch {
      alert("Failed to update order status");
    } finally {
      setUpdatingStatus(null);
    }
  }

  function openOrderModal(order: Order) {
    setSelectedOrder(order);
    if (!order.adminSeen) {
      fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAdminAuthHeaders() },
        body: JSON.stringify({ orderNumber: order.orderNumber, adminSeen: true }),
      }).catch((err) => console.error("Mark seen error:", err));

      setOrders((prev) =>
        prev.map((o) =>
          o.orderNumber === order.orderNumber ? { ...o, adminSeen: true } : o
        )
      );
    }
  }

  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((order) => {
      const matchSearch =
        !q ||
        order.orderNumber.toLowerCase().includes(q) ||
        order.customerName.toLowerCase().includes(q) ||
        order.email.toLowerCase().includes(q) ||
        (order.city && order.city.toLowerCase().includes(q));

      const s = order.status.toLowerCase();
      let matchStatus = true;
      if (statusFilter === "completed") {
        matchStatus = s === "completed" || s === "confirmed" || s === "delivered";
      } else if (statusFilter === "pending") {
        matchStatus = s === "pending" || s === "awaiting";
      } else if (statusFilter === "processing") {
        matchStatus = s === "processing" || s === "shipped";
      } else if (statusFilter === "cancelled") {
        matchStatus = s === "cancelled" || s === "canceled" || s === "failed";
      }

      return matchSearch && matchStatus;
    });
  }, [orders, query, statusFilter]);

  const metrics = useMemo(() => {
    const totalCount = orders.length;
    const totalRev = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const completedCount = orders.filter((o) => {
      const s = o.status.toLowerCase();
      return s === "completed" || s === "confirmed" || s === "delivered";
    }).length;
    const pendingCount = orders.filter((o) => {
      const s = o.status.toLowerCase();
      return s === "pending" || s === "awaiting";
    }).length;
    return { totalCount, totalRev, completedCount, pendingCount };
  }, [orders]);

  return (
    <AdminShell
      eyebrow="Orders Management"
      title="Customer Orders"
      description="View and manage store orders with real-time Supabase sync, item details, Notion sync tracking, and status controls."
    >
      <div>
        {/* KPI Metrics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-sm border border-line bg-cream p-5 shadow-xs">
            <p className="text-[0.62rem] font-medium tracking-[0.18em] uppercase text-muted">Total Orders</p>
            <p className="mt-2 font-serif text-3xl text-ink">{loading ? "…" : metrics.totalCount}</p>
            <p className="mt-1 text-xs text-ink-soft">Joined with Supabase order items</p>
          </div>
          <div className="rounded-sm border border-line bg-cream p-5 shadow-xs">
            <p className="text-[0.62rem] font-medium tracking-[0.18em] uppercase text-muted">Total Revenue</p>
            <p className="mt-2 font-serif text-3xl text-rose-deep">{loading ? "…" : formatCurrency(metrics.totalRev)}</p>
            <p className="mt-1 text-xs text-ink-soft">From confirmed orders</p>
          </div>
          <div className="rounded-sm border border-line bg-cream p-5 shadow-xs">
            <p className="text-[0.62rem] font-medium tracking-[0.18em] uppercase text-muted">Pending Action</p>
            <p className="mt-2 font-serif text-3xl text-amber-600">{loading ? "…" : metrics.pendingCount}</p>
            <p className="mt-1 text-xs text-amber-700/80">Requires fulfillment</p>
          </div>
          <div className="rounded-sm border border-line bg-cream p-5 shadow-xs">
            <p className="text-[0.62rem] font-medium tracking-[0.18em] uppercase text-muted">Completed</p>
            <p className="mt-2 font-serif text-3xl text-emerald-600">{loading ? "…" : metrics.completedCount}</p>
            <p className="mt-1 text-xs text-emerald-700/80">Successfully delivered</p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="mt-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-lg">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by Order ID or Customer Name, email…"
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
            <span className="text-[0.62rem] uppercase tracking-[0.18em] text-muted shrink-0">Filter:</span>
            {[
              { key: "all", label: "All Orders" },
              { key: "completed", label: "Completed" },
              { key: "processing", label: "Processing" },
              { key: "pending", label: "Pending" },
              { key: "cancelled", label: "Cancelled" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`shrink-0 rounded-sm px-3 py-1.5 text-[0.62rem] tracking-[0.16em] uppercase transition ${
                  statusFilter === tab.key
                    ? "bg-rose-deep text-cream font-medium"
                    : "border border-line bg-cream text-ink-soft hover:border-rose-light hover:bg-blush-soft"
                }`}
              >
                {tab.label}
              </button>
            ))}
            <button
              onClick={() => void loadOrders()}
              className="shrink-0 rounded-sm border border-line bg-cream px-3 py-1.5 text-[0.62rem] tracking-[0.16em] uppercase text-ink hover:bg-blush-soft"
              title="Refresh Orders"
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

        {/* Orders Table */}
        <div className="mt-6 rounded-sm border border-line bg-cream shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div className="h-4 w-28 bg-blush-soft animate-pulse rounded" />
                <div className="h-4 w-40 bg-blush-soft animate-pulse rounded" />
              </div>
              {[1, 2, 3, 4, 5].map((idx) => (
                <div key={idx} className="flex items-center justify-between py-3 border-b border-line/40 gap-4">
                  <div className="h-4 w-20 bg-blush-soft animate-pulse rounded" />
                  <div className="h-4 w-36 bg-blush-soft animate-pulse rounded" />
                  <div className="h-4 w-44 bg-blush-soft animate-pulse rounded hidden sm:block" />
                  <div className="h-4 w-24 bg-blush-soft animate-pulse rounded" />
                  <div className="h-6 w-20 bg-blush-soft animate-pulse rounded-full" />
                  <div className="h-4 w-20 bg-blush-soft animate-pulse rounded" />
                </div>
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-16 px-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blush-soft text-2xl">
                📦
              </div>
              <h3 className="mt-4 font-serif text-2xl text-ink">No Orders Found</h3>
              <p className="mt-1.5 text-sm text-ink-soft max-w-md mx-auto">
                {query || statusFilter !== "all"
                  ? "No orders match your current search and filter criteria. Try adjusting or clearing your filters."
                  : "When customers place orders on your store, they will appear here with real-time Supabase order item joins."}
              </p>
              {(query || statusFilter !== "all") && (
                <button
                  onClick={() => {
                    setQuery("");
                    setStatusFilter("all");
                  }}
                  className="mt-5 rounded-sm bg-rose-deep px-5 py-2.5 text-[0.65rem] tracking-[0.18em] uppercase text-cream hover:bg-rose transition"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-cream-deep/60 text-[0.62rem] uppercase tracking-[0.16em] text-muted">
                  <tr>
                    <th className="px-5 py-3.5 font-medium">Order ID</th>
                    <th className="px-5 py-3.5 font-medium">Customer Name</th>
                    <th className="px-5 py-3.5 font-medium">Customer Email</th>
                    <th className="px-5 py-3.5 font-medium">Items</th>
                    <th className="px-5 py-3.5 font-medium">Total Amount</th>
                    <th className="px-5 py-3.5 font-medium">Status</th>
                    <th className="px-5 py-3.5 font-medium">Date</th>
                    <th className="px-5 py-3.5 font-medium">Synced to Notion</th>
                    <th className="px-5 py-3.5 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {filteredOrders.map((order) => {
                    const isNew = order.adminSeen === false;
                    return (
                      <tr
                        key={order.orderNumber}
                        className={`transition group cursor-pointer ${
                          isNew ? "bg-rose-light/10 hover:bg-rose-light/20" : "hover:bg-blush-soft/30"
                        }`}
                        onClick={() => openOrderModal(order)}
                      >
                        <td className="px-5 py-4 font-mono text-xs font-semibold text-rose-deep whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {isNew && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-deep px-1.5 py-0.5 text-[0.52rem] font-bold tracking-wider uppercase text-cream animate-pulse">
                                NEW
                              </span>
                            )}
                            <span>{order.orderNumber}</span>
                          </div>
                        </td>

                        <td className="px-5 py-4 font-medium text-ink whitespace-nowrap">
                          {order.customerName}
                        </td>

                        <td className="px-5 py-4 text-xs text-ink-soft whitespace-nowrap">
                          <a
                            href={`mailto:${order.email}`}
                            onClick={(e) => e.stopPropagation()}
                            className="hover:text-rose-deep underline-offset-2 hover:underline"
                          >
                            {order.email}
                          </a>
                        </td>

                        <td className="px-5 py-4 min-w-[220px]">
                          {order.items && order.items.length > 0 ? (
                            <div className="space-y-1">
                              {order.items.slice(0, 2).map((item, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 text-xs text-ink">
                                  <span className="font-semibold text-rose-deep">{item.quantity}x</span>
                                  <span className="truncate max-w-[170px]">{item.name}</span>
                                  {item.variant && (
                                    <span className="text-[0.62rem] text-muted">({item.variant})</span>
                                  )}
                                </div>
                              ))}
                              {order.items.length > 2 && (
                                <span className="text-[0.65rem] text-muted italic">
                                  +{order.items.length - 2} more item{order.items.length - 2 > 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted italic">Standard Order</span>
                          )}
                        </td>

                        <td className="px-5 py-4 font-serif text-base font-semibold text-ink whitespace-nowrap">
                          {formatCurrency(order.total)}
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          {getStatusBadge(order.status)}
                        </td>

                        <td className="px-5 py-4 text-xs text-ink-soft whitespace-nowrap">
                          {formatDate(order.createdAt)}
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 px-2.5 py-1 text-[0.62rem] font-medium tracking-wider uppercase text-purple-700 border border-purple-300">
                            <svg className="h-3 w-3 fill-current text-purple-600" viewBox="0 0 24 24">
                              <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.373L18.47 2.295c-.42-.373-.98-.607-1.726-.56L3.993 2.715c-.42.047-.56.327-.373.56l.839.933zm.98 3.966v12.455c0 .793.42 1.166 1.306 1.12l14.288-.84c.886-.046 1.12-.56 1.12-1.306V7.194c0-.653-.28-.98-.84-.933l-15.034.886c-.56.047-.84.373-.84.933zm11.755 1.54c.093.373 0 .746-.373.793l-.84.14v8.257c-.42.233-.84.373-1.26.373-.7 0-1.026-.233-1.633-.98l-4.2-6.577v6.624l1.353.28c.373.093.466.42.373.793-.093.373-.466.42-.84.42l-2.613.14c-.373 0-.466-.373-.373-.747.093-.373.373-.42.746-.466l.84-.14V9.667l-1.12-.14c-.373-.047-.466-.373-.373-.747.093-.373.466-.42.84-.42l2.8-.14 4.526 6.81V8.874l-1.073-.14c-.373-.047-.466-.373-.373-.747.093-.373.466-.42.84-.42l2.613-.14c.373 0 .466.373.42.747z"/>
                            </svg>
                            Synced
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openOrderModal(order);
                            }}
                            className="rounded-sm border border-line px-3 py-1.5 text-[0.62rem] tracking-[0.14em] uppercase text-ink transition hover:border-rose-light hover:bg-blush-soft"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Order Detail Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/60 p-4 backdrop-blur-xs flex items-center justify-center animate-fade-up">
            <div className="relative w-full max-w-2xl rounded-sm border border-line bg-cream p-6 sm:p-8 shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
                <div>
                  <p className="eyebrow">Order Summary</p>
                  <h2 className="mt-1 font-serif text-2xl text-ink font-semibold">
                    {selectedOrder.orderNumber}
                  </h2>
                  <p className="text-xs text-muted mt-0.5">Placed on {formatDate(selectedOrder.createdAt)}</p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="rounded-full border border-line p-2 text-ink hover:text-rose-deep"
                  aria-label="Close"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 bg-blush-soft/30 p-4 rounded-sm border border-line/60">
                <div>
                  <h4 className="text-[0.62rem] uppercase tracking-[0.16em] text-muted font-medium">Customer Information</h4>
                  <p className="mt-1 text-sm font-semibold text-ink">{selectedOrder.customerName}</p>
                  <p className="text-xs text-ink-soft">{selectedOrder.email}</p>
                  {selectedOrder.phone && <p className="text-xs text-ink-soft">📞 {selectedOrder.phone}</p>}
                </div>

                <div>
                  <h4 className="text-[0.62rem] uppercase tracking-[0.16em] text-muted font-medium">Delivery Address</h4>
                  <p className="mt-1 text-xs text-ink">{selectedOrder.address || "Standard shipping"}</p>
                  <p className="text-xs text-ink-soft">
                    {[selectedOrder.city, selectedOrder.postalCode, selectedOrder.country].filter(Boolean).join(", ")}
                  </p>
                  {selectedOrder.note && (
                    <p className="mt-2 text-xs italic text-rose-deep bg-cream p-2 rounded-sm border border-line/40">
                      Note: &ldquo;{selectedOrder.note}&rdquo;
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-5">
                <h4 className="text-[0.62rem] uppercase tracking-[0.16em] text-muted font-medium mb-3">
                  Ordered Items ({selectedOrder.items?.length || 0})
                </h4>
                <div className="divide-y divide-line/60 rounded-sm border border-line bg-cream max-h-56 overflow-y-auto">
                  {selectedOrder.items && selectedOrder.items.length > 0 ? (
                    selectedOrder.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {item.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.image} alt="" className="h-10 w-10 rounded-sm object-cover border border-line" />
                          ) : (
                            <div className="h-10 w-10 rounded-sm bg-blush-soft flex items-center justify-center text-xs">💎</div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-ink truncate">{item.name}</p>
                            <p className="text-[0.65rem] text-muted">
                              Variant: {item.variant || "Standard"} • Qty: {item.quantity}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-ink">
                            {formatCurrency(item.unitPrice * item.quantity)}
                          </p>
                          <p className="text-[0.62rem] text-muted">{formatCurrency(item.unitPrice)} each</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="p-4 text-xs text-muted italic">No separate item records found for this order.</p>
                  )}
                </div>
              </div>

              <div className="mt-4 border-t border-line pt-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">Status:</span>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted mr-2">Total Amount:</span>
                  <span className="font-serif text-2xl font-semibold text-rose-deep">
                    {formatCurrency(selectedOrder.total)}
                  </span>
                </div>
              </div>

              <div className="mt-6 border-t border-line pt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[0.62rem] uppercase tracking-[0.16em] text-muted">Update Status:</span>
                  <select
                    value={selectedOrder.status}
                    disabled={updatingStatus === selectedOrder.orderNumber}
                    onChange={(e) => void updateStatus(selectedOrder.orderNumber, e.target.value)}
                    className="rounded-sm border border-line bg-cream px-3 py-1.5 text-xs text-ink outline-none focus:border-rose"
                  >
                    <option value="confirmed">Confirmed</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <button
                  onClick={() => setSelectedOrder(null)}
                  className="rounded-sm bg-rose-deep px-5 py-2 text-[0.65rem] tracking-[0.18em] uppercase text-cream hover:bg-rose transition"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
