import { NextResponse } from "next/server";
import {
  clearAdminSession,
  createAdminSession,
  isAdminAuthenticated,
  passwordIsValid,
  sessionToken,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authed = await isAdminAuthenticated(request);
  return NextResponse.json({
    authenticated: authed,
    token: authed ? sessionToken() : null,
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { password?: string };
    const rawPass = (body.password ?? "").trim();
    if (!passwordIsValid(rawPass)) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }
    await createAdminSession();
    const token = sessionToken();
    return NextResponse.json({ authenticated: true, token });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE() {
  await clearAdminSession();
  return NextResponse.json({ authenticated: false });
}
