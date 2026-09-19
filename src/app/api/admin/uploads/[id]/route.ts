import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { uploads } from "@/db/schema";
import { getMemoryUpload } from "@/lib/memory-store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const idNum = parseInt(id, 10);
    if (Number.isNaN(idNum)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    let mimeType = "";
    let dataBase64 = "";

    if (db) {
      try {
        const rows = await db.select().from(uploads).where(eq(uploads.id, idNum));
        if (rows[0]) { mimeType = rows[0].mimeType; dataBase64 = rows[0].dataBase64; }
      } catch { /* fall through */ }
    }

    if (!dataBase64) {
      const mem = getMemoryUpload(idNum);
      if (mem) { mimeType = mem.mimeType; dataBase64 = mem.dataBase64; }
    }

    if (!dataBase64) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const buffer = Buffer.from(dataBase64, "base64");
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mimeType || "image/jpeg",
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
