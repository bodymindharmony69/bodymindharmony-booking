import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { Resend } from "resend";

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

  const client_email =
    typeof body.client_email === "string" ? body.client_email.trim() || null : null;
  const client_phone =
    typeof body.client_phone === "string" ? body.client_phone.trim() || null : null;
  const address = typeof body.address === "string" ? body.address.trim() || null : null;
  const message = typeof body.message === "string" ? body.message.trim() || null : null;

  const { error } = await supabaseAdmin.from("booking_requests").insert({
    client_name,
    client_email,
    client_phone,
    booking_date,
    booking_time,
    address,
    message,
    status: "pending",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (process.env.RESEND_API_KEY && process.env.BOOKING_EMAIL && process.env.FROM_EMAIL) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: process.env.BOOKING_EMAIL,
      subject: "BodyMindHarmony booking request",
      text:
        `New booking request\n\n` +
        `Date: ${booking_date}\n` +
        `Time: ${booking_time}\n\n` +
        `Name: ${client_name}\n` +
        `Email: ${client_email ?? ""}\n` +
        `Phone: ${client_phone ?? ""}\n` +
        `Address/Postcode: ${address ?? ""}\n\n` +
        `Message:\n${message ?? ""}\n\n` +
        `Booking is not confirmed until approved and paid.`,
    });
  }

  return NextResponse.json({ success: true });
}
