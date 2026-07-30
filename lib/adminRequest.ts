import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, isValidAdminSession } from "./adminSession";

/** Returns a JSON Response if unauthorized; otherwise null. */
export function requireAdminSecret(request: NextRequest): NextResponse | null {
  try {
    if (isValidAdminSession(request.cookies.get(ADMIN_COOKIE)?.value)) return null;
  } catch {
    return NextResponse.json({ error: "Missing env: ADMIN_SECRET" }, { status: 500 });
  }
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
