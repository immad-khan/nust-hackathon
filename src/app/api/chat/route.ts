import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, orders, orderItems } from "@/db/schema";
import { desc, sql, eq } from "drizzle-orm";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { emitEvent } from "@/lib/events";

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  images?: string[];
};

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL || process.env.AI_MODEL || "openai/gpt-oss-120b";
const FALLBACK_MODELS = ["openai/gpt-oss-20b", "groq/compound", "qwen/qwen3.8-27b"];

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

const SYSTEM_PROMPT = `You are the AI assistant for "Prem by SHK", a luxury jewellery brand. You help the store owner (merchant) manage orders, inventory, analytics, and products.

Your capabilities:
1. Answer questions about orders, inventory, revenue, and product analytics
2. Create and add new products to the store catalog from merchant prompts or pasted images
3. Review product requirements and guide the merchant interactively
4. Provide business insights and recommendations

Available Categories:
- "earrings" (Earrings)
- "rings" (Rings)
- "necklaces" (Necklaces)
- "bracelets" (Bracelets)
- "cuffs" (Cuffs)
- "sets" (Gift Sets & Bridal Sets)

### Product Creation & Requirements Workflow:
When a merchant wants to add a product or attaches image(s):
1. Check what information is available:
   - Product Name (e.g. "Royal Kundan Choker")
   - Category (must be one of: earrings, rings, necklaces, bracelets, cuffs, sets)
   - Price in PKR (e.g. 45000)
   - Stock (default to 20 if not specified)
   - Material & Description (generate a fitting luxury description if none provided)
   - Images (use any [Attached Cloudinary Images] provided in the conversation)

2. If critical information (Name, Price, or Category) is MISSING:
   - Ask the merchant politely for the missing details.
   - Summarize what you have so far (e.g. image received, proposed name/category).
   - Show an interactive proposal code block:
\`\`\`action:propose_product
{
  "name": "Suggested Product Name",
  "categorySlug": "earrings",
  "price": 0,
  "stock": 20,
  "material": "18K Gold Plated",
  "shortDescription": "Handcrafted luxury jewellery piece.",
  "description": "Exquisite artisanal craftsmanship designed for enduring elegance.",
  "images": ["<image_url_if_any>"]
}
\`\`\`

3. When the merchant CONFIRMS (e.g. says "add", "add it", "yes", "confirm", "proceed", "looks good", or has provided all required details and wants to create):
   - You MUST output the creation action block in your response:
\`\`\`action:create_product
{
  "name": "Product Name",
  "categorySlug": "earrings",
  "price": 45000,
  "stock": 20,
  "material": "18K Gold Plated with Kundan Crystals",
  "shortDescription": "Handcrafted luxury jewellery piece.",
  "description": "Exquisite artisanal craftsmanship designed for enduring elegance.",
  "images": ["<image_url_if_any>"]
}
\`\`\`
   - Note: The server automatically parses the \`\`\`action:create_product ... \`\`\` block and inserts the product into the PostgreSQL database, registers it in \`sync_log\`, and creates the store slug.

Guidelines:
- Prices are in PKR (Pakistani Rupees). Format with commas (e.g. PKR 35,000).
- Be concise, helpful, and maintain a warm, luxury jewellery brand tone.
- Use **bold** for key attributes.`;

async function handleProductCreationAction(aiReply: string): Promise<{
  reply: string;
  createdProduct?: any;
}> {
  const match = aiReply.match(/```action:create_product\s*([\s\S]*?)\s*```/);
  if (!match) return { reply: aiReply };

  try {
    const rawJson = match[1].trim();
    const data = JSON.parse(rawJson);

    if (!data.name || !data.price) {
      return { reply: aiReply };
    }

    const name = String(data.name).trim();
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const randomSuffix = Math.random().toString(36).slice(2, 6);
    const slug = `${baseSlug || "product"}-${randomSuffix}`;
    const price = Math.max(0, Math.round(Number(data.price) || 0));
    const stock = Number(data.stock) || 20;
    const categorySlug = String(data.categorySlug || "earrings").toLowerCase().trim();
    const material = String(data.material || "18K Gold Plated").trim();
    const shortDesc = String(data.shortDescription || data.description || "").slice(0, 200);
    const desc = String(data.description || shortDesc || "Handcrafted luxury jewellery from Prem by SHK.");
    const images = Array.isArray(data.images) ? data.images.filter(Boolean) : [];

    if (db) {
      const inserted = await db
        .insert(products)
        .values({
          name,
          slug,
          categorySlug,
          categorySlugs: [categorySlug],
          price,
          compareAtPrice: data.compareAtPrice ? Number(data.compareAtPrice) : null,
          stock,
          material,
          shortDescription: shortDesc,
          description: desc,
          images,
          rating: 50,
          reviewCount: 0,
          isNew: true,
          isBestSeller: Boolean(data.isBestSeller),
        })
        .returning();

      // Emit product.created event (automatically writes into sync_log)
      emitEvent("product.created", {
        slug,
        name,
        category: categorySlug,
        price,
        stock,
        createdAt: new Date().toISOString(),
      }).catch((err) =>
        console.error("[chat] emitEvent product.created error:", err)
      );

      const cleanReply = aiReply
        .replace(/```action:create_product\s*[\s\S]*?\s*```/, "")
        .trim();

      const successCard = `\n\n✅ **Product Successfully Added to Store!**\n- **Name:** ${name}\n- **Price:** PKR ${price.toLocaleString()}\n- **Category:** ${categorySlug.toUpperCase()}\n- **Stock:** ${stock} units\n- **Slug:** \`${slug}\`\n\n🔗 [View Product in Store](/product/${slug}) · [Manage in Inventory](/admin/inventory)\n\n*(Recorded in database & logged to \`sync_log\` as \`product.created:${slug}\`)*`;

      return {
        reply: `${cleanReply}\n${successCard}`.trim(),
        createdProduct: inserted[0] || {
          slug,
          name,
          price,
          stock,
          categorySlug,
          images,
        },
      };
    }
  } catch (err) {
    console.error("[chat] Failed to parse/create product from action:", err);
  }

  return { reply: aiReply };
}

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

      // Format messages including attached images
      const formattedUserMessages = userMessages.slice(-10).map((m) => {
        let content = m.content;
        if (m.images && m.images.length > 0) {
          content += `\n\n[Attached Cloudinary Images:\n${m.images.map((img) => `- ${img}`).join("\n")}]`;
        }
        return {
          role: m.role,
          content,
        };
      });

      const candidateModels = Array.from(
        new Set([GROQ_MODEL, ...FALLBACK_MODELS].filter(Boolean))
      );

      for (const modelToTry of candidateModels) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 20000);

          const res = await fetch(GROQ_API_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${groqApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: modelToTry,
              messages: [systemMessage, ...formattedUserMessages],
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
            const rawReply =
              data.choices?.[0]?.message?.content || "No response generated.";

            // Process any product creation action
            const actionResult = await handleProductCreationAction(rawReply);

            return NextResponse.json({
              reply: actionResult.reply,
              createdProduct: actionResult.createdProduct,
            });
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
    query.includes("add") &&
    (query.includes("product") ||
      query.includes("item") ||
      query.includes("piece") ||
      query.includes("ring") ||
      query.includes("necklace") ||
      query.includes("earring") ||
      query.includes("bracelet"))
  ) {
    return `💎 **Add a New Product**\n\nTo add a new piece to your catalog:\n1. **Attach or paste an image** using the 📷 button or by pressing Ctrl+V\n2. Specify the details:\n   - **Name** (e.g. Royal Emerald Choker)\n   - **Category** (earrings, rings, necklaces, bracelets, cuffs, sets)\n   - **Price** in PKR (e.g. 45000)\n   - **Stock** (e.g. 15)\n\nOnce you review the requirements, reply **"Add"** or **"Yes"** and I will publish it to your store database and record it in \`sync_log\`!`;
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
