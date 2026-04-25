import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "../../../lib/requireEnv";

export const runtime = "nodejs";

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
  if (password !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
