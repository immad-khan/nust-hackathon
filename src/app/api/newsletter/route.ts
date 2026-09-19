import { NextResponse } from "next/server";
import { db } from "@/db";
import { subscribers } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = (body.email ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    if (db) {
      await db.insert(subscribers).values({ email }).onConflictDoNothing();
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
