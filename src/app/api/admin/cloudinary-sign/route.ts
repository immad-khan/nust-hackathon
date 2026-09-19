import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cloudName =
    process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    "hvt6foh0";
  const apiKey = process.env.CLOUDINARY_API_KEY || "212378614522658";
  const apiSecret = process.env.CLOUDINARY_API_SECRET || "HkUkAP2xg_ChFux2i2Qq5dOG9vc";

  const timestamp = Math.floor(Date.now() / 1000);
  const strToSign = `timestamp=${timestamp}${apiSecret}`;
  const signature = createHash("sha1").update(strToSign).digest("hex");

  return NextResponse.json({ cloudName, apiKey, timestamp, signature });
}
