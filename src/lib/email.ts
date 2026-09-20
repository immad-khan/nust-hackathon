import nodemailer from "nodemailer";
import { db } from "@/db";
import { syncLog } from "@/db/schema";
import { eq } from "drizzle-orm";

const user = process.env.EMAIL_HOST_USER || process.env.SMTP_USER || "immadonline702@gmail.com";
const rawPass = process.env.EMAIL_HOST_PASSWORD || process.env.SMTP_APP_PASSWORD || "";
const pass = rawPass.replace(/\s+/g, ""); // strip any spaces in app password
const host = process.env.EMAIL_HOST || "smtp.gmail.com";
const port = parseInt(process.env.EMAIL_PORT || "465", 10);
const fromName = process.env.EMAIL_FROM_NAME || "Prem by SHK";

function getTransporter() {
  if (!user || !pass) {
    return null;
  }
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    service: host.includes("gmail") ? "gmail" : undefined,
    auth: { user, pass },
  });
}

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  eventId?: string;
  metadata?: Record<string, any>;
}

export async function sendMail({
  to,
  subject,
  html,
  eventId,
  metadata = {},
}: SendMailOptions): Promise<{ success: boolean; error?: string }> {
  const finalEventId = eventId || `email:${Date.now()}:${to}`;

  // Log pending attempt in sync_log
  if (db) {
    try {
      await db
        .insert(syncLog)
        .values({
          eventId: finalEventId,
          type: "email",
          status: "pending",
          attempts: 1,
          error: "",
          payload: { to, subject, ...metadata },
        })
        .onConflictDoUpdate({
          target: syncLog.eventId,
          set: {
            payload: { to, subject, ...metadata },
          },
        });
    } catch (err) {
      console.warn(`[email] sync_log init error for ${finalEventId}:`, err);
    }
  }

  const transporter = getTransporter();
  if (!transporter) {
    const errorMsg = "SMTP credentials not configured (EMAIL_HOST_USER / EMAIL_HOST_PASSWORD)";
    console.warn(`[email] ${errorMsg}`);
    if (db) {
      await db
        .update(syncLog)
        .set({ status: "failed", error: errorMsg })
        .where(eq(syncLog.eventId, finalEventId))
        .catch(() => undefined);
    }
    return { success: false, error: errorMsg };
  }

  try {
    await transporter.sendMail({
      from: `"${fromName}" <${user}>`,
      to,
      subject,
      html,
    });

    if (db) {
      await db
        .update(syncLog)
        .set({ status: "success", error: "" })
        .where(eq(syncLog.eventId, finalEventId))
        .catch(() => undefined);
    }

    console.log(`[email] Successfully sent "${subject}" to ${to}`);
    return { success: true };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    console.error(`[email] Failed to send email to ${to}:`, errorMsg);

    if (db) {
      await db
        .update(syncLog)
        .set({ status: "failed", error: errorMsg })
        .where(eq(syncLog.eventId, finalEventId))
        .catch(() => undefined);
    }

    return { success: false, error: errorMsg };
  }
}

// -------------------------------------------------------------
// HTML EMAIL TEMPLATES (LUXURY JEWELLERY BRAND THEME)
// -------------------------------------------------------------

export interface OrderItemEmailData {
  name: string;
  variant?: string;
  quantity: number;
  unitPrice: number;
  image?: string;
}

export interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  items: OrderItemEmailData[];
  subtotal: number;
  shipping: number;
  total: number;
  status: string;
  note?: string;
  createdAt?: string;
}

/** Customer order confirmation email */
export function renderOrderConfirmationHtml(data: OrderEmailData): string {
  const itemsRows = data.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #ead6cc;">
        <div style="font-weight: 600; color: #452a20; font-size: 14px;">${item.name}</div>
        ${item.variant ? `<div style="font-size: 12px; color: #8b685b;">Variant: ${item.variant}</div>` : ""}
      </td>
      <td style="padding: 12px 8px; border-bottom: 1px solid #ead6cc; text-align: center; color: #6d4c3e; font-size: 13px;">
        ${item.quantity}
      </td>
      <td style="padding: 12px 0; border-bottom: 1px solid #ead6cc; text-align: right; font-weight: 600; color: #a35f3e; font-size: 14px;">
        PKR ${(item.unitPrice * item.quantity).toLocaleString()}
      </td>
    </tr>
  `
    )
    .join("");

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Order Confirmation - Prem by SHK</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #faf4f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #452a20;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #faf4f0; padding: 30px 15px;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 4px; border: 1px solid #ead6cc; overflow: hidden; box-shadow: 0 4px 12px rgba(69, 42, 32, 0.05);">
            <!-- Brand Header -->
            <tr>
              <td align="center" style="background: linear-gradient(135deg, #452a20 0%, #6d4c3e 100%); padding: 35px 20px;">
                <h1 style="margin: 0; color: #fbf3ef; font-family: Georgia, serif; font-size: 28px; letter-spacing: 3px; font-weight: 400;">PREM</h1>
                <p style="margin: 6px 0 0; color: #d9a184; font-size: 11px; letter-spacing: 2px; text-transform: uppercase;">Handcrafted Fine Jewellery</p>
              </td>
            </tr>

            <!-- Main Content -->
            <tr>
              <td style="padding: 35px 40px;">
                <div style="background-color: #faeae5; border-left: 3px solid #a35f3e; padding: 12px 18px; margin-bottom: 25px;">
                  <p style="margin: 0; font-size: 13px; color: #a35f3e; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Order Confirmed</p>
                  <p style="margin: 4px 0 0; font-size: 16px; font-family: Georgia, serif; color: #452a20;">Order ID: <strong>${data.orderNumber}</strong></p>
                </div>

                <p style="font-size: 15px; line-height: 1.6; color: #452a20; margin: 0 0 20px;">
                  Dear <strong>${data.customerName}</strong>,<br><br>
                  Thank you for your order with Prem by SHK. We are preparing your handcrafted jewellery pieces with the utmost care and precision.
                </p>

                <!-- Items Table -->
                <h3 style="font-family: Georgia, serif; font-size: 18px; color: #452a20; margin: 25px 0 12px; border-bottom: 1px solid #ead6cc; padding-bottom: 8px;">Order Summary</h3>
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                  <thead>
                    <tr style="color: #8b685b; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">
                      <th align="left" style="padding-bottom: 8px;">Item</th>
                      <th align="center" style="padding-bottom: 8px;">Qty</th>
                      <th align="right" style="padding-bottom: 8px;">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsRows}
                  </tbody>
                </table>

                <!-- Totals -->
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 15px; border-top: 2px solid #ead6cc; padding-top: 12px;">
                  <tr>
                    <td style="color: #8b685b; font-size: 13px; padding: 4px 0;">Subtotal</td>
                    <td align="right" style="color: #452a20; font-size: 13px; padding: 4px 0;">PKR ${data.subtotal.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style="color: #8b685b; font-size: 13px; padding: 4px 0;">Shipping</td>
                    <td align="right" style="color: #452a20; font-size: 13px; padding: 4px 0;">${data.shipping === 0 ? "FREE" : `PKR ${data.shipping.toLocaleString()}`}</td>
                  </tr>
                  <tr>
                    <td style="color: #452a20; font-size: 16px; font-weight: 700; padding: 10px 0 0; font-family: Georgia, serif;">Total</td>
                    <td align="right" style="color: #a35f3e; font-size: 18px; font-weight: 700; padding: 10px 0 0; font-family: Georgia, serif;">PKR ${data.total.toLocaleString()}</td>
                  </tr>
                </table>

                <!-- Shipping Address -->
                ${
                  data.address
                    ? `
                <div style="background-color: #fbf3ef; border: 1px solid #ead6cc; border-radius: 4px; padding: 16px; margin-top: 25px;">
                  <h4 style="margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #a35f3e;">Delivery Details</h4>
                  <p style="margin: 0; font-size: 13px; color: #6d4c3e; line-height: 1.5;">
                    ${data.address}<br>
                    ${data.city ? `${data.city}, ` : ""}${data.country || "Pakistan"}<br>
                    ${data.phone ? `Phone: ${data.phone}` : ""}
                  </p>
                </div>
                `
                    : ""
                }

                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ead6cc; text-align: center;">
                  <p style="margin: 0; font-size: 12px; color: #8b685b; line-height: 1.5;">
                    Have questions about your order? Reply directly to this email or reach us on WhatsApp.<br>
                    Thank you for choosing <strong>Prem by SHK</strong>.
                  </p>
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td align="center" style="background-color: #fbf3ef; padding: 20px; border-top: 1px solid #ead6cc; font-size: 11px; color: #8b685b;">
                © ${new Date().getFullYear()} PREM by SHK. All rights reserved.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}

/** Admin alert email when a new order is received */
export function renderAdminOrderAlertHtml(data: OrderEmailData): string {
  const itemsText = data.items
    .map((i) => `• ${i.quantity}x ${i.name}${i.variant ? ` (${i.variant})` : ""} — PKR ${(i.unitPrice * i.quantity).toLocaleString()}`)
    .join("<br>");

  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"></head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #faf4f0; padding: 25px; color: #452a20;">
    <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #ead6cc; border-radius: 6px; padding: 30px;">
      <div style="background: #a35f3e; color: #ffffff; padding: 12px 18px; border-radius: 4px; font-weight: 600; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px;">
        🔔 New Store Order Received
      </div>
      <h2 style="margin: 0 0 10px; font-family: Georgia, serif; color: #452a20;">Order ${data.orderNumber}</h2>
      <p style="font-size: 14px; color: #6d4c3e; margin: 0 0 15px;">
        <strong>Customer:</strong> ${data.customerName} (${data.email})<br>
        <strong>Phone:</strong> ${data.phone || "—"}<br>
        <strong>Delivery:</strong> ${data.address || "—"}, ${data.city || ""}, ${data.country || "Pakistan"}<br>
        <strong>Total Amount:</strong> <span style="color: #a35f3e; font-weight: bold;">PKR ${data.total.toLocaleString()}</span>
      </p>

      <div style="background: #fbf3ef; border: 1px solid #ead6cc; padding: 14px; border-radius: 4px; font-size: 13px; line-height: 1.6; margin-bottom: 20px;">
        <strong>Items Ordered:</strong><br>
        ${itemsText}
      </div>

      <p style="font-size: 12px; color: #8b685b;">
        This order has been registered in Supabase and queued for Fastn & Notion sync.
      </p>
    </div>
  </body>
  </html>
  `;
}

/** Status update email to customer */
export function renderOrderStatusUpdateHtml(data: {
  orderNumber: string;
  customerName: string;
  newStatus: string;
  total?: number;
}): string {
  const statusLabel = data.newStatus.toUpperCase();
  const statusColor =
    data.newStatus.toLowerCase() === "completed" || data.newStatus.toLowerCase() === "delivered"
      ? "#10b981"
      : data.newStatus.toLowerCase() === "processing" || data.newStatus.toLowerCase() === "shipped"
      ? "#0284c7"
      : "#d97706";

  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"></head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #faf4f0; padding: 25px; color: #452a20;">
    <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #ead6cc; border-radius: 6px; padding: 35px;">
      <div style="text-align: center; border-bottom: 1px solid #ead6cc; padding-bottom: 20px; margin-bottom: 25px;">
        <h1 style="margin: 0; color: #452a20; font-family: Georgia, serif; font-size: 26px; letter-spacing: 2px;">PREM</h1>
        <p style="margin: 4px 0 0; color: #a35f3e; font-size: 11px; letter-spacing: 2px; text-transform: uppercase;">Handcrafted Fine Jewellery</p>
      </div>

      <p style="font-size: 15px; line-height: 1.6; color: #452a20;">
        Dear <strong>${data.customerName}</strong>,<br><br>
        The status of your order <strong>${data.orderNumber}</strong> has been updated:
      </p>

      <div style="text-align: center; margin: 25px 0;">
        <span style="display: inline-block; background-color: ${statusColor}; color: #ffffff; padding: 8px 24px; border-radius: 20px; font-weight: 700; font-size: 13px; letter-spacing: 2px;">
          ${statusLabel}
        </span>
      </div>

      <p style="font-size: 14px; line-height: 1.6; color: #6d4c3e;">
        ${
          data.newStatus.toLowerCase() === "completed" || data.newStatus.toLowerCase() === "delivered"
            ? "Your package has been successfully delivered. We hope you love your new jewellery pieces!"
            : data.newStatus.toLowerCase() === "shipped"
            ? "Your order has been dispatched with our courier partner and is on its way to you."
            : data.newStatus.toLowerCase() === "processing"
            ? "Your jewellery is currently being polished, inspected, and packaged for dispatch."
            : "Your order is currently being reviewed and prepared."
        }
      </p>

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ead6cc; text-align: center; font-size: 12px; color: #8b685b;">
        Need assistance? Reply directly to this email or contact Prem by SHK support.
      </div>
    </div>
  </body>
  </html>
  `;
}
