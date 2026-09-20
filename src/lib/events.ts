import { db } from "@/db";
import { syncLog } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export type EventType =
  | "order.created"
  | "order.status_changed"
  | "product.created"
  | "product.updated"
  | "stock.low"
  | "appointment.created"
  | "subscriber.created"
  | (string & {});

export type EventPayload = Record<string, any>;

export interface EmitEventResult {
  success: boolean;
  eventId: string;
  deduplicated?: boolean;
  attempts: number;
  error?: string;
  notice?: string;
}

/**
 * Generate a deterministic event ID to prevent duplicate events on retries
 */
export function getDeterministicEventId(type: EventType, payload: EventPayload): string {
  if (payload.eventId || payload.event_id) {
    return String(payload.eventId || payload.event_id);
  }

  switch (type) {
    case "order.created":
      return `order.created:${payload.orderNumber || payload.order_number}`;
    case "order.status_changed":
      return `order.status_changed:${payload.orderNumber || payload.order_number}:${payload.newStatus || payload.status}`;
    case "product.created":
      return `product.created:${payload.slug}`;
    case "product.updated":
      return `product.updated:${payload.slug}:${payload.stock ?? "all"}`;
    case "stock.low":
      return `stock.low:${payload.slug}:${payload.stock}`;
    case "appointment.created":
      return `appointment.created:${payload.email}:${payload.preferredDate || payload.phone || Date.now()}`;
    case "subscriber.created":
      return `subscriber.created:${payload.email}`;
    default:
      return `${type}:${payload.id || payload.slug || payload.orderNumber || Date.now()}`;
  }
}

/**
 * Resolve target webhook URL based on event type
 */
function getWebhookUrlForEvent(type: EventType): string | undefined {
  if (type.startsWith("order.")) {
    return process.env.FASTN_ORDER_WEBHOOK_URL || process.env.FASTN_WEBHOOK_URL;
  }
  if (type.startsWith("product.") || type.startsWith("stock.")) {
    return process.env.FASTN_INVENTORY_WEBHOOK_URL || process.env.FASTN_WEBHOOK_URL;
  }
  return process.env.FASTN_WEBHOOK_URL || process.env.FASTN_ORDER_WEBHOOK_URL;
}

/**
 * emitEvent - Core event dispatcher
 *
 * 1. Computes deterministic eventId for deduplication.
 * 2. Checks sync_log: skips remote dispatch if already marked success.
 * 3. Upserts sync_log in database.
 * 4. Posts to Fastn webhook with secret header.
 * 5. Retries up to 3 times with exponential backoff on failure.
 * 6. Marks sync_log as success or failed with error details.
 */
export async function emitEvent(
  type: EventType,
  payload: EventPayload,
  options: { maxRetries?: number } = {}
): Promise<EmitEventResult> {
  const maxRetries = options.maxRetries ?? 3;
  const eventId = getDeterministicEventId(type, payload);

  // 1. Check existing log for deduplication
  if (db) {
    try {
      const [existing] = await db
        .select()
        .from(syncLog)
        .where(eq(syncLog.eventId, eventId));

      if (existing && existing.status === "success") {
        return {
          success: true,
          eventId,
          deduplicated: true,
          attempts: existing.attempts,
        };
      }

      // Upsert pending entry into sync_log
      await db
        .insert(syncLog)
        .values({
          eventId,
          type,
          status: "pending",
          attempts: 0,
          error: "",
          payload,
        })
        .onConflictDoUpdate({
          target: syncLog.eventId,
          set: {
            payload,
          },
        });
    } catch (dbErr) {
      console.error(`[emitEvent] DB init sync_log error for ${eventId}:`, dbErr);
    }
  }

  const webhookUrl = getWebhookUrlForEvent(type);
  const secret =
    process.env.FASTN_WEBHOOK_SECRET ||
    process.env.FASTN_SECRET ||
    "prem_fastn_secret_2026";

  // If webhook URL is not configured yet (e.g. dev/staging before Fastn credentials provided)
  if (!webhookUrl) {
    const notice = "Webhook URL not configured yet. Logged locally in sync_log.";
    if (db) {
      await db
        .update(syncLog)
        .set({ status: "success", error: notice })
        .where(eq(syncLog.eventId, eventId))
        .catch(() => undefined);
    }
    return {
      success: true,
      eventId,
      attempts: 0,
      notice,
    };
  }

  const dispatchPayload = {
    event_id: eventId,
    event_type: type,
    timestamp: new Date().toISOString(),
    data: payload,
  };

  let lastError = "";
  let attemptCount = 0;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    attemptCount = attempt;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-webhook-secret": secret,
          "x-fastn-secret": secret,
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify(dispatchPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        // Success! Update sync_log
        if (db) {
          await db
            .update(syncLog)
            .set({
              status: "success",
              error: "",
              attempts: attemptCount,
            })
            .where(eq(syncLog.eventId, eventId))
            .catch(() => undefined);
        }

        return {
          success: true,
          eventId,
          attempts: attemptCount,
        };
      }

      const errText = await res.text().catch(() => `HTTP ${res.status}`);
      lastError = `HTTP ${res.status}: ${errText.slice(0, 300)}`;
      console.warn(`[emitEvent] Attempt ${attempt}/${maxRetries} failed for ${eventId}: ${lastError}`);
    } catch (err: any) {
      lastError = err?.message || String(err);
      console.warn(`[emitEvent] Attempt ${attempt}/${maxRetries} threw for ${eventId}: ${lastError}`);
    }

    // Exponential backoff delay before retry (except last attempt)
    if (attempt < maxRetries) {
      const delayMs = attempt * 500;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // All retries failed - record failure in sync_log
  if (db) {
    await db
      .update(syncLog)
      .set({
        status: "failed",
        error: lastError,
        attempts: attemptCount,
      })
      .where(eq(syncLog.eventId, eventId))
      .catch(() => undefined);
  }

  return {
    success: false,
    eventId,
    attempts: attemptCount,
    error: lastError,
  };
}
