import { NextRequest, NextResponse } from "next/server";
import { requireAdminSecret } from "../../../../../lib/adminRequest";
import { listBookingRequestsPg } from "../../../../../lib/bookingAdminPg";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const denied = requireAdminSecret(request);
  if (denied) return denied;

  const { rows, error } = await listBookingRequestsPg();
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ bookings: rows });
}
