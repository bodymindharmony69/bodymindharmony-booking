import { NextRequest, NextResponse } from "next/server";
import { requireAdminSecret } from "../../../../../lib/adminRequest";
import {
  getPendingBookingForAcceptPg,
  markBookingAcceptedAndBlockDatePg,
} from "../../../../../lib/bookingAdminPg";
import {
  sendAdminBookingAcceptedNotification,
  sendBookingAcceptedEmail,
} from "../../../../../lib/email";
import { createBookingPaymentLink, createStripeClient } from "../../../../../lib/stripe";

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

  const loaded = await getPendingBookingForAcceptPg(id);
  if ("error" in loaded) {
    return NextResponse.json({ error: loaded.error }, { status: loaded.code });
  }

  const finalPrice = parseFinalPriceFromBody(body.final_price);
  if (finalPrice === undefined) {
    return NextResponse.json({ error: "Final price is required" }, { status: 400 });
  }

  const { row } = loaded;
  const bookingWithPrice = { ...row, final_price: finalPrice };

  let checkout: { id: string; url: string; expiresAt: number };
  try {
    checkout = await createBookingPaymentLink({
      id: row.id,
      client_name: row.client_name,
      client_email: row.client_email,
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
    paymentUrl: checkout.url,
    paymentStatus: "unpaid",
    stripeCheckoutSessionId: checkout.id,
    reservationExpiresAt: new Date(checkout.expiresAt * 1000).toISOString(),
  });
  if ("error" in done) {
    try {
      await createStripeClient().checkout.sessions.expire(checkout.id);
    } catch (error) {
      console.error("expire unused Stripe checkout:", error);
    }
    return NextResponse.json({ error: done.error }, { status: done.code });
  }

  const acceptedPayload = {
    client_name: row.client_name,
    client_email: row.client_email,
    client_phone: row.client_phone,
    booking_date: row.booking_date,
    booking_time: row.booking_time,
    address: row.address,
    message: row.message,
    status: "accepted",
    final_price: finalPrice,
    payment_url: checkout.url,
  };

  console.log("ACCEPT booking client_email:", row.client_email);

  try {
    await sendBookingAcceptedEmail(acceptedPayload);
  } catch (e) {
    console.error("sendBookingAcceptedEmail (accept):", e);
  }
  try {
    await sendAdminBookingAcceptedNotification(acceptedPayload);
  } catch (e) {
    console.error("sendAdminBookingAcceptedNotification (accept):", e);
  }

  return NextResponse.json({ success: true, payment_url: checkout.url });
}
