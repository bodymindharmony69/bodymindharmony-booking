import { NextRequest, NextResponse } from "next/server";
import { requireAdminSecret } from "../../../../../lib/adminRequest";
import { declineBookingPg } from "../../../../../lib/bookingAdminPg";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const denied = requireAdminSecret(request);
  if (denied) return denied;

  let body: { id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const result = await declineBookingPg(id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.code });
  }

  return NextResponse.json({ success: true });
}
