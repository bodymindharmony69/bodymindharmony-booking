import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "../../../lib/requireEnv";
import { timingSafeEqual } from "node:crypto";
import {
  ADMIN_COOKIE,
  adminCookieOptions,
  createAdminSession,
  isValidAdminSession,
} from "../../../lib/adminSession";

export const runtime = "nodejs";

const attempts = new Map<string, { count: number; resetAt: number }>();

function sameSecret(provided: string, expected: string): boolean {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Checks password against ADMIN_SECRET (server-only). */
export async function POST(request: NextRequest) {
  let expected: string;
  try {
    expected = requireEnv("ADMIN_SECRET");
  } catch {
    return NextResponse.json({ error: "Missing env: ADMIN_SECRET" }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password.trim() : "";
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const current = attempts.get(ip);
  const attempt = !current || current.resetAt <= now ? { count: 0, resetAt: now + 15 * 60_000 } : current;
  if (attempt.count >= 10) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }
  if (!sameSecret(password, expected)) {
    attempt.count++;
    attempts.set(ip, attempt);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  attempts.delete(ip);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, createAdminSession(), adminCookieOptions);
  return response;
}

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      ok: isValidAdminSession(request.cookies.get(ADMIN_COOKIE)?.value),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, "", { ...adminCookieOptions, maxAge: 0 });
  return response;
}
