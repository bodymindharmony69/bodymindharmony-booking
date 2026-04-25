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

export async function insertBookingRequestPg(row: BookingInsertRow): Promise<{ error?: string }> {
  try {
    const sb = createSupabaseAdmin();
    const { error } = await sb.from("booking_requests").insert({
      client_name: row.client_name,
      client_email: row.client_email,
      client_phone: row.client_phone,
      booking_date: row.booking_date,
      booking_time: row.booking_time,
      address: row.address,
      message: row.message,
      status: "pending",
    });
    if (error) return { error: error.message };
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
