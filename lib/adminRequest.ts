import { NextRequest, NextResponse } from "next/server";

/** Returns a JSON Response if unauthorized; otherwise null. */
export function requireAdminSecret(request: NextRequest): NextResponse | null {
  const expected = process.env.ADMIN_SECRET?.trim();
  if (!expected) {
    return NextResponse.json({ error: "Admin not configured" }, { status: 500 });
  }
  const provided = request.headers.get("x-admin-secret")?.trim();
  if (provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
