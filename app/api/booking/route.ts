import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "../../../lib/supabaseClient";
import { Resend } from "resend";

export async function POST(request: NextRequest) {
  const body = await request.json();

  const requiredFields = ["selectedDate", "selectedTime", "name", "email", "phone", "address"];

  for (const field of requiredFields) {
    if (!body[field]) {
      return NextResponse.json({ error: `${field} is required` }, { status: 400 });
    }
  }

  const { error } = await supabaseClient.from("booking_requests").insert({
    client_name: String(body.name).trim(),
    client_email: String(body.email).trim(),
    client_phone: String(body.phone).trim(),
    booking_date: String(body.selectedDate).trim(),
    booking_time: String(body.selectedTime).trim(),
    address: String(body.address).trim(),
    message: body.message ? String(body.message).trim() : null,
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
        `Date: ${body.selectedDate}\n` +
        `Time: ${body.selectedTime}\n\n` +
        `Name: ${body.name}\n` +
        `Email: ${body.email}\n` +
        `Phone: ${body.phone}\n` +
        `Address/Postcode: ${body.address}\n\n` +
        `Message:\n${body.message || ""}\n\n` +
        `Booking is not confirmed until approved and paid.`,
    });
  }

  return NextResponse.json({ ok: true });
}
