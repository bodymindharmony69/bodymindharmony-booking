import { NextRequest, NextResponse } from "next/server";

/** Checks password against ADMIN_SECRET (server-only). */
export async function POST(request: NextRequest) {
  const expected = process.env.ADMIN_SECRET?.trim();
  if (!expected) {
    return NextResponse.json({ error: "Admin not configured" }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  if (typeof body.password !== "string" || body.password !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
