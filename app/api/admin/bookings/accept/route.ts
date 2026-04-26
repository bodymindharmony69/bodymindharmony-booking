import { NextRequest, NextResponse } from "next/server";
import { requireAdminSecret } from "../../../../../lib/adminRequest";
import {
  getPendingBookingForAcceptPg,
  markBookingAcceptedAndBlockDatePg,
} from "../../../../../lib/bookingAdminPg";
import { createCalendarEvent } from "../../../../../lib/googleCalendar";
import { sendBookingAcceptedEmail } from "../../../../../lib/email";
import { createBookingPaymentLink } from "../../../../../lib/stripe";

export const runtime = "nodejs";

function parseFinalPriceFromBody(raw: unknown): number | undefined {
  if (raw == null || raw === "") return undefined;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const t = raw.trim().replace(/£/g, "");
    if (!t) return undefined;
    const n = parseFloat(t);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

export async function POST(request: NextRequest) {
  const denied = requireAdminSecret(request);
  if (denied) return denied;

  let body: { id?: string; final_price?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const finalPrice = parseFinalPriceFromBody(body.final_price);
  if (finalPrice === undefined) {
    return NextResponse.json({ error: "Final price is required" }, { status: 400 });
  }

  const loaded = await getPendingBookingForAcceptPg(id);
  if ("error" in loaded) {
    return NextResponse.json({ error: loaded.error }, { status: loaded.code });
  }

  const { row } = loaded;
  const bookingWithPrice = { ...row, final_price: finalPrice };

  try {
    await createCalendarEvent({
      client_name: bookingWithPrice.client_name,
      client_phone: bookingWithPrice.client_phone,
      client_email: bookingWithPrice.client_email,
      address: bookingWithPrice.address,
      message: bookingWithPrice.message,
      booking_date: bookingWithPrice.booking_date,
      booking_time: bookingWithPrice.booking_time,
      final_price: bookingWithPrice.final_price,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Google Calendar failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  let paymentUrl: string;
  try {
    paymentUrl = await createBookingPaymentLink({
      id: row.id,
      client_name: row.client_name,
      booking_date: row.booking_date,
      booking_time: row.booking_time,
      final_price: finalPrice,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stripe checkout failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const done = await markBookingAcceptedAndBlockDatePg(id, row.booking_date, {
    finalPrice,
    paymentUrl,
    paymentStatus: "pending",
  });
  if ("error" in done) {
    return NextResponse.json({ error: done.error }, { status: done.code });
  }

  try {
    await sendBookingAcceptedEmail({
      client_name: row.client_name,
      client_email: row.client_email,
      booking_date: row.booking_date,
      booking_time: row.booking_time,
      address: row.address,
      final_price: finalPrice,
      payment_url: paymentUrl,
    });
  } catch (e) {
    console.error("sendBookingAcceptedEmail (accept):", e);
  }

  return NextResponse.json({ success: true, payment_url: paymentUrl });
}
