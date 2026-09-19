import { NextResponse } from "next/server";
import { db } from "@/db";
import { appointments } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      phone?: string;
      preferredDate?: string;
      message?: string;
    };

    if (!body.name || !body.email) {
      return NextResponse.json(
        { error: "Name and email are required." },
        { status: 400 },
      );
    }

    if (db) {
      await db.insert(appointments).values({
        name: body.name,
        email: body.email,
        phone: body.phone ?? "",
        preferredDate: body.preferredDate ?? "",
        message: body.message ?? "",
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
