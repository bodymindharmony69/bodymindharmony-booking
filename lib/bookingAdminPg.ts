import { createSupabaseAdmin } from "./supabaseAdmin";

export type BookingRow = {
  id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  booking_date: string;
  booking_time: string;
  address: string | null;
  message: string | null;
  status: string;
  created_at: string;
  final_price: number | null;
  payment_url: string | null;
  payment_status: string | null;
  stripe_checkout_session_id: string | null;
  google_event_id: string | null;
};

function toYmd(d: unknown): string {
  if (typeof d === "string") return d.slice(0, 10);
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

function parseFinalPrice(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

function mapBookingRow(r: Record<string, unknown>): BookingRow {
  const created = r.created_at;
  const created_at =
    created instanceof Date ? created.toISOString() : typeof created === "string" ? created : String(created);
  return {
    id: String(r.id),
    client_name: String(r.client_name),
    client_email: r.client_email == null ? null : String(r.client_email),
    client_phone: r.client_phone == null ? null : String(r.client_phone),
    booking_date: toYmd(r.booking_date),
    booking_time: String(r.booking_time),
    address: r.address == null ? null : String(r.address),
    message: r.message == null ? null : String(r.message),
    status: String(r.status),
    created_at,
    final_price: "final_price" in r ? parseFinalPrice(r.final_price) : null,
    payment_url: "payment_url" in r && r.payment_url != null ? String(r.payment_url) : null,
    payment_status: "payment_status" in r && r.payment_status != null ? String(r.payment_status) : null,
    stripe_checkout_session_id:
      "stripe_checkout_session_id" in r && r.stripe_checkout_session_id != null
        ? String(r.stripe_checkout_session_id)
        : null,
    google_event_id: "google_event_id" in r && r.google_event_id != null ? String(r.google_event_id) : null,
  };
}

export async function listBookingRequestsPg(): Promise<{ rows: BookingRow[]; error?: string }> {
  try {
    const sb = createSupabaseAdmin();
    const { data, error } = await sb.from("booking_requests").select("*").order("created_at", { ascending: false });
    if (error) return { rows: [], error: error.message };
    const rows = (data ?? []).map((r) => mapBookingRow(r as Record<string, unknown>));
    rows.sort((a, b) => {
      const ap = a.status === "pending" ? 0 : 1;
      const bp = b.status === "pending" ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return { rows };
  } catch (e) {
    return { rows: [], error: e instanceof Error ? e.message : String(e) };
  }
}

export async function getPendingBookingForAcceptPg(
  id: string,
): Promise<{ ok: true; row: BookingRow } | { error: string; code: number }> {
  try {
    const sb = createSupabaseAdmin();
    const { data, error } = await sb.from("booking_requests").select("*").eq("id", id).maybeSingle();
    if (error) return { error: error.message, code: 500 };
    if (!data) return { error: "Not found", code: 404 };
    const row = mapBookingRow(data as Record<string, unknown>);
    if (row.status !== "pending") return { error: "Booking is not pending", code: 409 };
    return { ok: true, row };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e), code: 500 };
  }
}

export type AcceptBookingOptions = {
  finalPrice: number;
  paymentUrl: string;
  paymentStatus?: string;
  stripeCheckoutSessionId: string;
  reservationExpiresAt: string;
};

/** After Google Calendar + Stripe: upsert blocked_dates, then set booking accepted with payment fields when supported. */
export async function markBookingAcceptedAndBlockDatePg(
  id: string,
  bookingDateYmd: string,
  options: AcceptBookingOptions,
): Promise<{ ok: true } | { error: string; code: number }> {
  try {
    const sb = createSupabaseAdmin();
    const { error: blockErr } = await sb.from("blocked_dates").insert({ date: bookingDateYmd });
    if (blockErr) {
      if (blockErr.code === "23505") return { error: "This date is already reserved.", code: 409 };
      return { error: blockErr.message, code: 500 };
    }

    const fp = Number(options.finalPrice);
    if (!Number.isFinite(fp)) return { error: "Invalid final price", code: 400 };

    const paymentStatus = options.paymentStatus ?? "pending";
    const url = options.paymentUrl;

    const full = {
      status: "awaiting_payment" as const,
      final_price: fp,
      payment_url: url,
      payment_status: paymentStatus,
      stripe_checkout_session_id: options.stripeCheckoutSessionId,
      reservation_expires_at: options.reservationExpiresAt,
    };

    let { data, error: upErr } = await sb
      .from("booking_requests")
      .update(full)
      .eq("id", id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (upErr && /payment_url|payment_status/i.test(upErr.message)) {
      const mid = { status: "accepted" as const, final_price: fp };
      const r2 = await sb
        .from("booking_requests")
        .update(mid)
        .eq("id", id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      data = r2.data;
      upErr = r2.error;
    }

    if (upErr && /final_price/i.test(upErr.message)) {
      const r3 = await sb
        .from("booking_requests")
        .update({ status: "accepted" })
        .eq("id", id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      data = r3.data;
      upErr = r3.error;
    }

    if (upErr) {
      await sb.from("blocked_dates").delete().eq("date", bookingDateYmd);
      return { error: upErr.message, code: 500 };
    }
    if (!data) {
      await sb.from("blocked_dates").delete().eq("date", bookingDateYmd);
      const { data: ex } = await sb.from("booking_requests").select("id").eq("id", id).maybeSingle();
      if (!ex) return { error: "Not found", code: 404 };
      return { error: "Booking is not pending", code: 409 };
    }
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e), code: 500 };
  }
}

export async function getBookingByStripeSessionPg(sessionId: string): Promise<BookingRow | null> {
  const sb = createSupabaseAdmin();
  const { data, error } = await sb
    .from("booking_requests")
    .select("*")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapBookingRow(data as Record<string, unknown>) : null;
}

export async function markBookingPaidPg(id: string, googleEventId: string): Promise<void> {
  const sb = createSupabaseAdmin();
  const { error } = await sb
    .from("booking_requests")
    .update({
      status: "accepted",
      payment_status: "paid",
      payment_completed_at: new Date().toISOString(),
      google_event_id: googleEventId,
    })
    .eq("id", id)
    .neq("payment_status", "paid");
  if (error) throw new Error(error.message);
}

export async function releaseExpiredBookingPg(sessionId: string): Promise<void> {
  const sb = createSupabaseAdmin();
  const { data, error } = await sb
    .from("booking_requests")
    .update({
      status: "pending",
      payment_status: "expired",
      payment_url: null,
      stripe_checkout_session_id: null,
      reservation_expires_at: null,
    })
    .eq("stripe_checkout_session_id", sessionId)
    .eq("status", "awaiting_payment")
    .select("booking_date")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data?.booking_date) {
    const { error: deleteError } = await sb.from("blocked_dates").delete().eq("date", data.booking_date);
    if (deleteError) throw new Error(deleteError.message);
  }
}

export async function declineBookingPg(
  id: string,
): Promise<{ ok: true } | { error: string; code: number }> {
  try {
    const sb = createSupabaseAdmin();
    const { data, error } = await sb
      .from("booking_requests")
      .update({ status: "declined" })
      .eq("id", id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (error) return { error: error.message, code: 500 };
    if (!data) {
      const { data: ex } = await sb.from("booking_requests").select("id").eq("id", id).maybeSingle();
      if (!ex) return { error: "Not found", code: 404 };
      return { error: "Booking is not pending", code: 409 };
    }
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e), code: 500 };
  }
}
