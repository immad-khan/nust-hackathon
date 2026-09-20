import { eq } from "drizzle-orm";
import { db } from "@/db";
import { syncLog } from "@/db/schema";

export type FastnEvent = {
  event_id: string;
  type: string;
  payload: Record<string, unknown>;
};

export async function emitEvent(evt: FastnEvent) {
  if (db) {
    try {
      await db
        .insert(syncLog)
        .values({
          eventId: evt.event_id,
          type: evt.type,
          payload: evt,
          status: "pending",
          attempts: 0,
          error: "",
        })
        .onConflictDoNothing();

      const [row] = await db
        .select()
        .from(syncLog)
        .where(eq(syncLog.eventId, evt.event_id));

      if (row?.status === "success") {
        return { ok: true, skipped: true };
      }
    } catch (dbErr) {
      console.error("[fastn] DB syncLog check error:", dbErr);
    }
  }

  let lastError = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const url = process.env.FASTN_WEBHOOK_URL;
      if (!url) throw new Error("FASTN_WEBHOOK_URL not set");

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(evt),
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      if (db) {
        await db
          .update(syncLog)
          .set({ status: "success", attempts: attempt, error: "" })
          .where(eq(syncLog.eventId, evt.event_id))
          .catch(() => undefined);
      }

      return { ok: true };
    } catch (e: any) {
      lastError = e.message || String(e);
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
      }
    }
  }

  if (db) {
    await db
      .update(syncLog)
      .set({ status: "failed", attempts: 3, error: lastError })
      .where(eq(syncLog.eventId, evt.event_id))
      .catch(() => undefined);
  }

  return { ok: false, error: lastError };
}

export function orderCreatedEvent(order: any, items: any[]): FastnEvent {
  return {
    event_id: `order.created:${order.orderNumber}`,
    type: "order.created",
    payload: {
      order_number: order.orderNumber,
      created_at: new Date(order.createdAt || Date.now()).toISOString(),
      customer_name: order.customerName,
      email: order.email,
      phone: order.phone ?? "",
      city: order.city ?? "",
      items: items
        .map((i) => `${i.name}${i.variant ? ` (${i.variant})` : ""} x${i.quantity}`)
        .join(", "),
      subtotal: order.subtotal,
      shipping: order.shipping,
      total: order.total,
      status: order.status,
      admin_seen: false,
      updated_at: new Date().toISOString(),
    },
  };
}
