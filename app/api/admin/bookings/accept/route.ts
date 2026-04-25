import { NextRequest, NextResponse } from "next/server";
import { requireAdminSecret } from "../../../../../lib/adminRequest";
import { acceptBookingTransactionPg } from "../../../../../lib/bookingAdminPg";
import {
  createCalendarEvent,
  isGoogleCalendarConfigured,
} from "../../../../../lib/googleCalendar";

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

  const result = await acceptBookingTransactionPg(id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.code });
  }

  const { row } = result;

  let calendarWarning: string | undefined;
  if (isGoogleCalendarConfigured()) {
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
      console.error("Google Calendar (accept booking):", e);
      calendarWarning =
        e instanceof Error ? e.message : "Google Calendar event could not be created.";
    }
  }

  return NextResponse.json({
    success: true,
    ...(calendarWarning ? { calendarWarning } : {}),
  });
}
