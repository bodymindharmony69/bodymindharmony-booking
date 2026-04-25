import pg from "pg";

function connectionString(): string | undefined {
  return (
    process.env.POSTGRES_URL_NON_POOLING?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    undefined
  );
}

/** Remove sslmode from URL so `ssl: { rejectUnauthorized: false }` is not overridden (needed on Vercel → Supabase). */
function stripSslQueryParams(cs: string): string {
  const q = cs.indexOf("?");
  if (q === -1) return cs;
  const base = cs.slice(0, q);
  const qs = cs.slice(q + 1);
  const parts = qs
    .split("&")
    .filter((p) => p && !/^sslmode=/i.test(p) && !/^sslrootcert=/i.test(p));
  return parts.length ? `${base}?${parts.join("&")}` : base;
}

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
  const raw = connectionString();
  if (!raw) {
    return { error: "Missing POSTGRES_URL (or NON_POOLING) for booking insert." };
  }
  const cs = stripSslQueryParams(raw);
  const isLocal = cs.includes("localhost") || cs.includes("127.0.0.1");
  const client = new pg.Client({
    connectionString: cs,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
  });
  try {
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
    return { error: message };
  } finally {
    await client.end().catch(() => undefined);
  }
}
