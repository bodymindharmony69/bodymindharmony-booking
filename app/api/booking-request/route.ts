import { NextRequest, NextResponse } from "next/server";
import { insertBookingRequestPg } from "../../../lib/insertBookingRequestPg";
import { Resend } from "resend";

export const runtime = "nodejs";
import {
  isAllowedBookingTime,
  isValidCalendarDateYMD,
} from "../../../lib/bookingRules";

function clip(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max);
}

const MAX_NAME = 200;
const MAX_EMAIL = 254;
const MAX_PHONE = 50;
const MAX_ADDRESS = 500;
const MAX_MESSAGE = 8000;

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const client_name = clip(
    typeof body.client_name === "string" ? body.client_name.trim() : "",
    MAX_NAME,
  );
  if (!client_name) {
    return NextResponse.json({ error: "client_name is required" }, { status: 400 });
  }

  const booking_date = typeof body.booking_date === "string" ? body.booking_date.trim() : "";
  const booking_time = typeof body.booking_time === "string" ? body.booking_time.trim() : "";
  if (!booking_date || !booking_time) {
    return NextResponse.json({ error: "booking_date and booking_time are required" }, { status: 400 });
  }
  if (!isValidCalendarDateYMD(booking_date)) {
    return NextResponse.json({ error: "booking_date must be a valid YYYY-MM-DD" }, { status: 400 });
  }
  if (!isAllowedBookingTime(booking_time)) {
    return NextResponse.json({ error: "booking_time is not an available slot" }, { status: 400 });
  }

  const client_email =
    typeof body.client_email === "string"
      ? clip(body.client_email.trim(), MAX_EMAIL) || null
      : null;
  const client_phone =
    typeof body.client_phone === "string"
      ? clip(body.client_phone.trim(), MAX_PHONE) || null
      : null;
  const address =
    typeof body.address === "string" ? clip(body.address.trim(), MAX_ADDRESS) || null : null;
  const message =
    typeof body.message === "string" ? clip(body.message.trim(), MAX_MESSAGE) || null : null;

  const { error: insertErr } = await insertBookingRequestPg({
    client_name,
    client_email,
    client_phone,
    booking_date,
    booking_time,
    address,
    message,
  });

  if (insertErr) {
    return NextResponse.json({ error: insertErr }, { status: 500 });
  }

  if (process.env.RESEND_API_KEY && process.env.BOOKING_EMAIL && process.env.FROM_EMAIL) {
    try {
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
    } catch (e) {
      console.error("Resend (booking-request):", e);
    }
  }

  return NextResponse.json({ success: true });
}
