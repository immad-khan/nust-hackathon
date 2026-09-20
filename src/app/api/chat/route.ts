import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, orders, orderItems } from "@/db/schema";
import { desc, sql, eq } from "drizzle-orm";
import { isAdminAuthenticated } from "@/lib/admin-auth";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL || process.env.AI_MODEL || "openai/gpt-oss-120b";
const FALLBACK_MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];

/** Gather live store context from the database */
async function getStoreContext(): Promise<string> {
  if (!db) return "Database is not connected.";

  try {
    // Product stats
    const allProducts = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        price: products.price,
        stock: products.stock,
        isBestSeller: products.isBestSeller,
        categorySlug: products.categorySlug,
      })
      .from(products);

    const totalProducts = allProducts.length;
    const lowStock = allProducts.filter((p) => p.stock < 10);
    const outOfStock = allProducts.filter((p) => p.stock === 0);
    const bestSellers = allProducts.filter((p) => p.isBestSeller);
    const totalInventoryValue = allProducts.reduce(
      (sum, p) => sum + p.price * p.stock,
      0
    );

    // Order stats
    const allOrders = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        customerName: orders.customerName,
        email: orders.email,
        total: orders.total,
        status: orders.status,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(50);

    const totalOrders = allOrders.length;
    const pendingOrders = allOrders.filter(
      (o) => o.status === "pending" || o.status === "confirmed"
    );
    const completedOrders = allOrders.filter((o) => o.status === "completed");
    const totalRevenue = allOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    // Today's orders
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOrders = allOrders.filter(
      (o) => o.createdAt && new Date(o.createdAt) >= today
    );
    const todayRevenue = todayOrders.reduce(
      (sum, o) => sum + (o.total || 0),
      0
    );

    // Categories breakdown
    const categoryMap = new Map<string, number>();
    allProducts.forEach((p) => {
      categoryMap.set(
        p.categorySlug,
        (categoryMap.get(p.categorySlug) || 0) + 1
      );
    });

    let context = `## Live Store Data (Prem by SHK — Jewellery E-Commerce)\n\n`;
    context += `### Products\n`;
    context += `- Total products listed: ${totalProducts}\n`;
    context += `- Best sellers: ${bestSellers.length} (${bestSellers.map((p) => p.name).join(", ") || "none"})\n`;
    context += `- Low stock (< 10): ${lowStock.length}${lowStock.length ? " — " + lowStock.map((p) => `${p.name} (${p.stock} left)`).join(", ") : ""}\n`;
    context += `- Out of stock: ${outOfStock.length}${outOfStock.length ? " — " + outOfStock.map((p) => p.name).join(", ") : ""}\n`;
    context += `- Total inventory value: PKR ${totalInventoryValue.toLocaleString()}\n`;
    context += `- Categories: ${Array.from(categoryMap.entries()).map(([k, v]) => `${k} (${v})`).join(", ") || "none"}\n\n`;

    context += `### Orders\n`;
    context += `- Total orders: ${totalOrders}\n`;
    context += `- Pending / confirmed: ${pendingOrders.length}\n`;
    context += `- Completed: ${completedOrders.length}\n`;
    context += `- Total revenue: PKR ${totalRevenue.toLocaleString()}\n`;
    context += `- Today's orders: ${todayOrders.length} (PKR ${todayRevenue.toLocaleString()})\n\n`;

    if (allOrders.length > 0) {
      context += `### Recent Orders (latest 10)\n`;
      allOrders.slice(0, 10).forEach((o) => {
        const date = o.createdAt
          ? new Date(o.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })
          : "—";
        context += `- ${o.orderNumber}: ${o.customerName} — PKR ${(o.total || 0).toLocaleString()} — ${o.status} — ${date}\n`;
      });
      context += "\n";
    }

    if (allProducts.length > 0) {
      context += `### All Products\n`;
      allProducts.forEach((p) => {
        context += `- ${p.name} | PKR ${p.price.toLocaleString()} | stock: ${p.stock} | ${p.categorySlug}${p.isBestSeller ? " | ⭐ bestseller" : ""}\n`;
      });
    }

    return context;
  } catch (error) {
    console.error("[chat] Failed to gather store context:", error);
    return "Could not load store data from database.";
  }
}

const SYSTEM_PROMPT = `You are the AI assistant for "Prem by SHK", a premium jewellery e-commerce store. You help the store owner (merchant) manage their business.

Your capabilities:
1. Answer questions about orders, inventory, revenue, and product analytics
2. Provide business insights and recommendations
3. Help identify low-stock items that need restocking
4. Summarize order patterns and customer trends

Guidelines:
- Be concise but helpful. Use bullet points and numbers.
- Prices are in PKR (Pakistani Rupees).
- Format currency with commas (e.g. PKR 12,500).
- If you don't have enough data to answer, say so honestly.
- For actions you can't perform (like updating stock), tell the merchant which admin page to use.
- Use a professional but warm tone suitable for a luxury jewellery brand.
- Use **bold** for emphasis and - for bullet points in your responses.`;

export async function POST(req: NextRequest) {
  // Auth check
  const authResult = await isAdminAuthenticated(req);
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { messages?: ChatMessage[] };
    const userMessages = body.messages || [];

    if (!userMessages.length) {
      return NextResponse.json(
        { error: "No messages provided" },
        { status: 400 }
      );
    }

    // Get live store data
    const storeContext = await getStoreContext();

    const groqApiKey = process.env.GROQ_API_KEY;

    // If Groq API key is available, attempt LLM call
    if (groqApiKey) {
      const systemMessage: ChatMessage = {
        role: "system",
        content: `${SYSTEM_PROMPT}\n\nHere is the current live store data:\n\n${storeContext}`,
      };

      const candidateModels = Array.from(
        new Set([GROQ_MODEL, ...FALLBACK_MODELS].filter(Boolean))
      );

      for (const modelToTry of candidateModels) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);

          const res = await fetch(GROQ_API_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${groqApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: modelToTry,
              messages: [systemMessage, ...userMessages.slice(-10)],
              temperature: 0.7,
              max_tokens: 1024,
              top_p: 0.9,
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (res.ok) {
            const data = (await res.json()) as {
              choices?: { message?: { content?: string } }[];
            };
            const reply =
              data.choices?.[0]?.message?.content || "No response generated.";
            return NextResponse.json({ reply });
          } else {
            const errBody = await res.text();
            console.warn(`[chat] Model ${modelToTry} failed (${res.status}):`, errBody);
          }
        } catch (modelErr) {
          console.warn(`[chat] Request failed for model ${modelToTry}:`, modelErr);
        }
      }
    }

    // Fallback: generate a smart response from DB data without LLM
    const lastMessage = userMessages[userMessages.length - 1];
    const query = (lastMessage?.content || "").toLowerCase();
    const reply = generateFallbackReply(query, storeContext);

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("[chat] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Chat request failed",
      },
      { status: 500 }
    );
  }
}

/** Generate a helpful response using just the DB data when Groq is unavailable */
function generateFallbackReply(query: string, storeContext: string): string {
  // Parse some basic stats from the context
  const lines = storeContext.split("\n");

  if (
    query.includes("order") &&
    (query.includes("today") || query.includes("recent"))
  ) {
    const todayLine = lines.find((l) => l.includes("Today's orders"));
    const recentSection = storeContext.split("### Recent Orders")[1] || "";
    return `📦 **Today's Orders**\n\n${todayLine || "No order data available."}\n\n**Recent orders:**\n${recentSection.split("###")[0]?.trim() || "No recent orders found."}\n\n*For full order management, visit the [Orders page](/admin/orders).*`;
  }

  if (query.includes("low") && query.includes("stock")) {
    const lowStockLine = lines.find((l) => l.includes("Low stock"));
    const outOfStockLine = lines.find((l) => l.includes("Out of stock"));
    return `📊 **Inventory Alert**\n\n${lowStockLine || "No low-stock data."}\n${outOfStockLine || ""}\n\n*Manage stock levels on the [Inventory page](/admin/inventory).*`;
  }

  if (query.includes("revenue") || query.includes("sales")) {
    const revenueLine = lines.find((l) => l.includes("Total revenue"));
    const todayLine = lines.find((l) => l.includes("Today's orders"));
    return `💰 **Revenue Overview**\n\n${revenueLine || "No revenue data."}\n${todayLine || ""}\n\n*View detailed order analytics on the [Orders page](/admin/orders).*`;
  }

  if (query.includes("best") && query.includes("sell")) {
    const bsLine = lines.find((l) => l.includes("Best sellers"));
    return `⭐ **Best Sellers**\n\n${bsLine || "No bestseller data available."}\n\n*Manage product flags on the [Products page](/admin).*`;
  }

  if (
    query.includes("product") ||
    query.includes("catalog") ||
    query.includes("inventory")
  ) {
    const totalLine = lines.find((l) => l.includes("Total products listed"));
    const valueLine = lines.find((l) =>
      l.includes("Total inventory value")
    );
    const catLine = lines.find((l) => l.includes("Categories"));
    return `💎 **Product Overview**\n\n${totalLine || "No product data."}\n${valueLine || ""}\n${catLine || ""}\n\n*Manage your catalog on the [Products page](/admin).*`;
  }

  if (query.includes("order")) {
    const totalLine = lines.find((l) => l.includes("Total orders"));
    const pendingLine = lines.find((l) => l.includes("Pending"));
    const completedLine = lines.find((l) => l.includes("Completed"));
    return `📦 **Orders Overview**\n\n${totalLine || "No order data."}\n${pendingLine || ""}\n${completedLine || ""}\n\n*Manage orders on the [Orders page](/admin/orders).*`;
  }

  if (query.includes("sync") || query.includes("notion")) {
    return `🔄 **Notion Sync**\n\nThe sync system is configured through the Integrations page. When Fastn credentials are set up:\n- **Orders** auto-sync to Notion when placed\n- **Inventory** changes sync when stock is updated\n\n*Configure syncs on the [Integrations page](/admin/integrations).*\n\n⚠️ *Fastn API credentials are required. Please contact your team to set up FASTN_ORDER_WEBHOOK_URL and FASTN_INVENTORY_WEBHOOK_URL.*`;
  }

  if (query.includes("help") || query.includes("what can you")) {
    return `✨ **Here's what I can help with:**\n\n- **Orders** — view today's orders, pending orders, revenue stats\n- **Inventory** — check low stock items, product counts, inventory value\n- **Products** — bestsellers, categories, catalog overview\n- **Analytics** — revenue, sales trends, customer patterns\n- **Notion Sync** — status and troubleshooting\n\nTry asking me something specific like:\n- *"Show me today's orders"*\n- *"Which products are low on stock?"*\n- *"What's our total revenue?"*`;
  }

  // Default: show a summary
  return `Here's a quick summary of your store:\n\n${storeContext.split("###").slice(1, 3).map((s) => "### " + s.trim()).join("\n\n")}\n\n💡 *For AI-powered responses, add your Groq API key to the environment variables (GROQ_API_KEY). Ask me about orders, inventory, revenue, or anything store-related!*`;
}
