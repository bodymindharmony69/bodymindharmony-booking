import { NextRequest, NextResponse } from "next/server";
import { requireAdminSecret } from "../../../../../lib/adminRequest";
import {
  getPendingBookingForAcceptPg,
  markBookingAcceptedAndBlockDatePg,
} from "../../../../../lib/bookingAdminPg";
import { createCalendarEvent } from "../../../../../lib/googleCalendar";

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

  const loaded = await getPendingBookingForAcceptPg(id);
  if ("error" in loaded) {
    return NextResponse.json({ error: loaded.error }, { status: loaded.code });
  }

  const { row } = loaded;

  try {
    await createCalendarEvent({
      client_name: row.client_name,
      client_phone: row.client_phone,
      client_email: row.client_email,
      address: row.address,
      message: row.message,
      booking_date: row.booking_date,
      booking_time: row.booking_time,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Google Calendar failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const done = await markBookingAcceptedAndBlockDatePg(id, row.booking_date);
  if ("error" in done) {
    return NextResponse.json({ error: done.error }, { status: done.code });
  }

  return NextResponse.json({ success: true });
}
