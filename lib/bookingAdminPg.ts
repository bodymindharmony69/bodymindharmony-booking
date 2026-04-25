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
};

function toYmd(d: unknown): string {
  if (typeof d === "string") return d.slice(0, 10);
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
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
  };
}

export async function listBookingRequestsPg(): Promise<{ rows: BookingRow[]; error?: string }> {
  try {
    const sb = createSupabaseAdmin();
    const { data, error } = await sb
      .from("booking_requests")
      .select("id, client_name, client_email, client_phone, booking_date, booking_time, address, message, status, created_at")
      .order("created_at", { ascending: false });
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
    const { data, error } = await sb
      .from("booking_requests")
      .select("id, client_name, client_email, client_phone, booking_date, booking_time, address, message, status, created_at")
      .eq("id", id)
      .maybeSingle();
    if (error) return { error: error.message, code: 500 };
    if (!data) return { error: "Not found", code: 404 };
    const row = mapBookingRow(data as Record<string, unknown>);
    if (row.status !== "pending") return { error: "Booking is not pending", code: 409 };
    return { ok: true, row };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e), code: 500 };
  }
}

export async function markBookingAcceptedAndBlockDatePg(
  id: string,
): Promise<{ ok: true } | { error: string; code: number }> {
  try {
    const sb = createSupabaseAdmin();
    const { data: updated, error: upErr } = await sb
      .from("booking_requests")
      .update({ status: "accepted" })
      .eq("id", id)
      .eq("status", "pending")
      .select("booking_date")
      .maybeSingle();
    if (upErr) return { error: upErr.message, code: 500 };
    if (!updated) {
      const { data: ex } = await sb.from("booking_requests").select("status").eq("id", id).maybeSingle();
      if (!ex) return { error: "Not found", code: 404 };
      return { error: "Booking is not pending", code: 409 };
    }
    const dateStr = toYmd((updated as { booking_date: unknown }).booking_date);
    const { error: insErr } = await sb.from("blocked_dates").insert({ date: dateStr });
    if (insErr) {
      const code = (insErr as { code?: string }).code;
      const msg = insErr.message ?? "";
      if (code === "23505" || msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique")) {
        return { ok: true };
      }
      return { error: insErr.message, code: 500 };
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
