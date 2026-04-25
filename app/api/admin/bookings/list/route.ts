import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";
import { requireAdminSecret } from "../../../../../lib/adminRequest";

export async function GET(request: NextRequest) {
  const denied = requireAdminSecret(request);
  if (denied) return denied;

  const { data, error } = await supabaseAdmin
    .from("booking_requests")
    .select(
      "id, client_name, client_email, client_phone, booking_date, booking_time, address, message, status, created_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ bookings: data ?? [] });
}
