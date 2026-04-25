import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "./requireEnv";

/** Returns a JSON Response if unauthorized; otherwise null. */
export function requireAdminSecret(request: NextRequest): NextResponse | null {
  let expected: string;
  try {
    expected = requireEnv("ADMIN_SECRET");
  } catch {
    return NextResponse.json({ error: "Missing env: ADMIN_SECRET" }, { status: 500 });
  }
  const provided = (request.headers.get("x-admin-secret") ?? "").trim();
  if (provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
