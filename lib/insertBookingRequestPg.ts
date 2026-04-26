import { createSupabaseAdmin } from "./supabaseAdmin";

export type BookingInsertRow = {
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  booking_date: string;
  booking_time: string;
  address: string | null;
  message: string | null;
};

export type InsertedBookingRequestRow = BookingInsertRow & {
  id: string;
  status: string;
  created_at: string;
};

const INSERT_RETURN =
  "id, client_name, client_email, client_phone, booking_date, booking_time, address, message, status, created_at";

export async function insertBookingRequestPg(
  row: BookingInsertRow,
): Promise<{ row?: InsertedBookingRequestRow; error?: string }> {
  try {
    const sb = createSupabaseAdmin();
    const { data, error } = await sb
      .from("booking_requests")
      .insert({
        client_name: row.client_name,
        client_email: row.client_email,
        client_phone: row.client_phone,
        booking_date: row.booking_date,
        booking_time: row.booking_time,
        address: row.address,
        message: row.message,
        status: "pending",
      })
      .select(INSERT_RETURN)
      .single();
    if (error) return { error: error.message };
    if (!data) return { error: "Insert returned no row" };
    const r = data as Record<string, unknown>;
    const created = r.created_at;
    const created_at =
      created instanceof Date ? created.toISOString() : typeof created === "string" ? created : String(created);
    const inserted: InsertedBookingRequestRow = {
      id: String(r.id),
      client_name: String(r.client_name),
      client_email: r.client_email == null ? null : String(r.client_email),
      client_phone: r.client_phone == null ? null : String(r.client_phone),
      booking_date: typeof r.booking_date === "string" ? r.booking_date.slice(0, 10) : String(r.booking_date).slice(0, 10),
      booking_time: String(r.booking_time),
      address: r.address == null ? null : String(r.address),
      message: r.message == null ? null : String(r.message),
      status: String(r.status),
      created_at,
    };
    return { row: inserted };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
