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
  };
}

const BOOKING_SELECT_BASE =
  "id, client_name, client_email, client_phone, booking_date, booking_time, address, message, status, created_at";

async function selectBookingsWithOptionalFinalPrice(sb: ReturnType<typeof createSupabaseAdmin>) {
  const withFinal = await sb
    .from("booking_requests")
    .select(`${BOOKING_SELECT_BASE}, final_price`)
    .order("created_at", { ascending: false });
  if (!(withFinal.error && /final_price/i.test(withFinal.error.message))) {
    return { data: withFinal.data, error: withFinal.error };
  }
  return await sb.from("booking_requests").select(BOOKING_SELECT_BASE).order("created_at", { ascending: false });
}

async function selectOneBookingWithOptionalFinalPrice(
  sb: ReturnType<typeof createSupabaseAdmin>,
  id: string,
) {
  const withFinal = await sb
    .from("booking_requests")
    .select(`${BOOKING_SELECT_BASE}, final_price`)
    .eq("id", id)
    .maybeSingle();
  if (!(withFinal.error && /final_price/i.test(withFinal.error.message))) {
    return { data: withFinal.data, error: withFinal.error };
  }
  return await sb.from("booking_requests").select(BOOKING_SELECT_BASE).eq("id", id).maybeSingle();
}

export async function listBookingRequestsPg(): Promise<{ rows: BookingRow[]; error?: string }> {
  try {
    const sb = createSupabaseAdmin();
    const { data, error } = await selectBookingsWithOptionalFinalPrice(sb);
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
    const { data, error } = await selectOneBookingWithOptionalFinalPrice(sb, id);
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
  finalPrice?: number | null;
};

/** After Google Calendar succeeds: upsert blocked_dates, then set booking accepted (and final_price when supported). */
export async function markBookingAcceptedAndBlockDatePg(
  id: string,
  bookingDateYmd: string,
  options?: AcceptBookingOptions,
): Promise<{ ok: true } | { error: string; code: number }> {
  try {
    const sb = createSupabaseAdmin();
    const { error: blockErr } = await sb
      .from("blocked_dates")
      .upsert({ date: bookingDateYmd }, { onConflict: "date" });
    if (blockErr) return { error: blockErr.message, code: 500 };

    const fp =
      options?.finalPrice != null && Number.isFinite(options.finalPrice) ? Number(options.finalPrice) : undefined;
    const updateWithPrice: { status: string; final_price?: number } =
      fp != null ? { status: "accepted", final_price: fp } : { status: "accepted" };

    let { data, error: upErr } = await sb
      .from("booking_requests")
      .update(updateWithPrice)
      .eq("id", id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (upErr && updateWithPrice.final_price != null && /final_price/i.test(upErr.message)) {
      const r2 = await sb
        .from("booking_requests")
        .update({ status: "accepted" })
        .eq("id", id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      data = r2.data;
      upErr = r2.error;
    }

    if (upErr) return { error: upErr.message, code: 500 };
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
