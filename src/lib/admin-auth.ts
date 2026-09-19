import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "prem_admin_session";
const FALLBACK_PASSWORD = "prembyshk";

export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD || FALLBACK_PASSWORD;
}

export function sessionToken(): string {
  return createHash("sha256")
    .update(`prem-by-shk:${adminPassword().trim().toLowerCase()}`)
    .digest("hex");
}

export function passwordIsValid(value: string): boolean {
  const received = (value || "").trim().toLowerCase();
  const expected = adminPassword().trim().toLowerCase();
  if (!received || !expected) return false;
  try {
    const bufReceived = Buffer.from(received);
    const bufExpected = Buffer.from(expected);
    if (bufReceived.length !== bufExpected.length) return false;
    return timingSafeEqual(bufReceived, bufExpected);
  } catch {
    return received === expected;
  }
}

export async function isAdminAuthenticated(request?: Request): Promise<boolean> {
  // 1. Check Authorization header or x-admin-token header
  if (request) {
    const authHeader =
      request.headers.get("authorization") || request.headers.get("x-admin-token");
    if (authHeader) {
      const token = authHeader.replace(/^Bearer\s+/i, "").trim();
      if (token === sessionToken()) return true;
    }

    const passwordHeader = request.headers.get("x-admin-password");
    if (passwordHeader && passwordIsValid(passwordHeader)) return true;
  }

  // 2. Fall back to cookie
  try {
    const store = await cookies();
    const cookieVal = store.get(ADMIN_COOKIE)?.value;
    if (cookieVal === sessionToken()) return true;
  } catch {
    // ignore
  }

  return false;
}

export async function createAdminSession(): Promise<void> {
  try {
    const store = await cookies();
    store.set(ADMIN_COOKIE, sessionToken(), {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // works in all preview environments (http & https)
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days session
    });
  } catch {
    // ignore
  }
}

export async function clearAdminSession(): Promise<void> {
  try {
    const store = await cookies();
    store.delete(ADMIN_COOKIE);
  } catch {
    // ignore
  }
}
