import { createPgClient } from "./pgFromEnv";

export type BookingInsertRow = {
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  booking_date: string;
  booking_time: string;
  address: string | null;
  message: string | null;
};

/** Inserts into booking_requests over Postgres (bypasses PostgREST schema cache issues). */
export async function insertBookingRequestPg(row: BookingInsertRow): Promise<{ error?: string }> {
  let client;
  try {
    client = createPgClient();
    await client.connect();
    await client.query(
      `insert into public.booking_requests (
        client_name, client_email, client_phone, booking_date, booking_time, address, message, status
      ) values ($1, $2, $3, $4::date, $5, $6, $7, 'pending')`,
      [
        row.client_name,
        row.client_email,
        row.client_phone,
        row.booking_date,
        row.booking_time,
        row.address,
        row.message,
      ],
    );
    return {};
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes("Missing POSTGRES_URL")) {
      return { error: "Missing POSTGRES_URL (or NON_POOLING) for booking insert." };
    }
    return { error: message };
  } finally {
    await client?.end().catch(() => undefined);
  }
}
