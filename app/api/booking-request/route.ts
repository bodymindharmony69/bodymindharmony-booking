import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const client_name = typeof body.client_name === "string" ? body.client_name.trim() : "";
  if (!client_name) {
    return NextResponse.json({ error: "client_name is required" }, { status: 400 });
  }

  const booking_date = typeof body.booking_date === "string" ? body.booking_date.trim() : "";
  const booking_time = typeof body.booking_time === "string" ? body.booking_time.trim() : "";
  if (!booking_date || !booking_time) {
    return NextResponse.json({ error: "booking_date and booking_time are required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("booking_requests").insert({
    client_name,
    client_email: typeof body.client_email === "string" ? body.client_email.trim() || null : null,
    client_phone: typeof body.client_phone === "string" ? body.client_phone.trim() || null : null,
    booking_date,
    booking_time,
    address: typeof body.address === "string" ? body.address.trim() || null : null,
    message: typeof body.message === "string" ? body.message.trim() || null : null,
    status: "pending",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
