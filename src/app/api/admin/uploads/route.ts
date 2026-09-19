import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { db } from "@/db";
import { uploads } from "@/db/schema";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { addMemoryUpload } from "@/lib/memory-store";

export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/x-adobe-dng",
  "image/dng",
]);

async function uploadToCloudinary(base64Data: string, mime: string): Promise<string | null> {
  const cloudName =
    process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    "hvt6foh0";
  const apiKey = process.env.CLOUDINARY_API_KEY || "212378614522658";
  const apiSecret = process.env.CLOUDINARY_API_SECRET || "HkUkAP2xg_ChFux2i2Qq5dOG9vc";

  if (!cloudName || !apiKey || !apiSecret) return null;

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const strToSign = `timestamp=${timestamp}${apiSecret}`;
    const signature = createHash("sha1").update(strToSign).digest("hex");

    const formData = new FormData();
    formData.append("file", `data:${mime};base64,${base64Data}`);
    formData.append("api_key", apiKey);
    formData.append("timestamp", String(timestamp));
    formData.append("signature", signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) return null;
    const json = (await res.json()) as { secure_url?: string };
    return json.secure_url ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = (await request.json()) as {
      fileName?: string;
      mimeType?: string;
      dataBase64?: string;
    };

    if (!body.dataBase64) {
      return NextResponse.json({ error: "Image data is required." }, { status: 400 });
    }

    const mime = body.mimeType ?? "image/jpeg";
    const sizeBytes = Math.round((body.dataBase64.length * 3) / 4);

    if (!ALLOWED_TYPES.has(mime)) {
      return NextResponse.json({ error: "Only JPEG, PNG and WebP images are allowed." }, { status: 415 });
    }
    if (sizeBytes > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Image must be smaller than 5 MB." }, { status: 413 });
    }

    // Try Cloudinary first
    const cloudinaryUrl = await uploadToCloudinary(body.dataBase64, mime);
    if (cloudinaryUrl) {
      return NextResponse.json({ url: cloudinaryUrl });
    }

    if (db) {
      try {
        const inserted = await db
          .insert(uploads)
          .values({
            originalName: body.fileName ?? "upload",
            mimeType: mime,
            sizeBytes,
            dataBase64: body.dataBase64,
          })
          .returning();
        const url = `/api/admin/uploads/${inserted[0].id}`;
        return NextResponse.json({ url, id: inserted[0].id });
      } catch {
        // fall through to memory
      }
    }

    const mem = addMemoryUpload({
      originalName: body.fileName ?? "upload",
      mimeType: mime,
      sizeBytes,
      dataBase64: body.dataBase64,
    });
    return NextResponse.json({ url: `/api/admin/uploads/${mem.id}`, id: mem.id });
  } catch (error) {
    console.error("upload error", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
