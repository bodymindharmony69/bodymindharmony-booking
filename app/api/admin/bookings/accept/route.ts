import { NextRequest, NextResponse } from "next/server";
import { requireAdminSecret } from "../../../../../lib/adminRequest";
import {
  getPendingBookingForAcceptPg,
  markBookingAcceptedAndBlockDatePg,
} from "../../../../../lib/bookingAdminPg";
import { createCalendarEvent } from "../../../../../lib/googleCalendar";
import { sendBookingAcceptedEmail } from "../../../../../lib/email";

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

  const finalPriceFromRequest = parseFinalPriceFromBody(body.final_price);

  const loaded = await getPendingBookingForAcceptPg(id);
  if ("error" in loaded) {
    return NextResponse.json({ error: loaded.error }, { status: loaded.code });
  }

  const { row } = loaded;
  const effectiveFinalPrice =
    finalPriceFromRequest !== undefined
      ? finalPriceFromRequest
      : row.final_price != null && Number.isFinite(row.final_price)
        ? row.final_price
        : undefined;

  try {
    await createCalendarEvent({
      client_name: row.client_name,
      client_phone: row.client_phone,
      client_email: row.client_email,
      address: row.address,
      message: row.message,
      booking_date: row.booking_date,
      booking_time: row.booking_time,
      final_price: effectiveFinalPrice ?? null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Google Calendar failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const done = await markBookingAcceptedAndBlockDatePg(id, row.booking_date, {
    finalPrice: effectiveFinalPrice,
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
      final_price: effectiveFinalPrice ?? null,
    });
  } catch (e) {
    console.error("sendBookingAcceptedEmail (accept):", e);
  }

  return NextResponse.json({ success: true });
}
