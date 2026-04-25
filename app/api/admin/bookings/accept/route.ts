import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";
import { requireAdminSecret } from "../../../../../lib/adminRequest";
import {
  createCalendarEvent,
  isGoogleCalendarConfigured,
} from "../../../../../lib/googleCalendar";

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

  const { data: row, error: fetchErr } = await supabaseAdmin
    .from("booking_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (row.status !== "pending") {
    return NextResponse.json({ error: "Booking is not pending" }, { status: 409 });
  }

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
      // Still accept booking in DB when Calendar fails (misconfig / quota / etc.)
    }
  }

  const dateStr =
    typeof row.booking_date === "string"
      ? row.booking_date
      : row.booking_date instanceof Date
        ? row.booking_date.toISOString().slice(0, 10)
        : String(row.booking_date).slice(0, 10);

  const { error: blockErr } = await supabaseAdmin
    .from("blocked_dates")
    .upsert({ date: dateStr }, { onConflict: "date", ignoreDuplicates: true });

  if (blockErr) {
    return NextResponse.json({ error: blockErr.message }, { status: 500 });
  }

  const { data: updated, error: updErr } = await supabaseAdmin
    .from("booking_requests")
    .update({ status: "accepted" })
    .eq("id", id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ error: "Booking is not pending" }, { status: 409 });
  }

  return NextResponse.json({ success: true });
}
