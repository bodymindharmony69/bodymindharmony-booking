import type { QueryResultRow } from "pg";
import { withPg } from "./pgFromEnv";

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

function mapBookingRow(r: QueryResultRow): BookingRow {
  const d = r.booking_date;
  const booking_date =
    d instanceof Date ? d.toISOString().slice(0, 10) : typeof d === "string" ? d.slice(0, 10) : String(d);
  const c = r.created_at;
  const created_at = c instanceof Date ? c.toISOString() : String(c);
  return {
    id: String(r.id),
    client_name: String(r.client_name),
    client_email: r.client_email == null ? null : String(r.client_email),
    client_phone: r.client_phone == null ? null : String(r.client_phone),
    booking_date,
    booking_time: String(r.booking_time),
    address: r.address == null ? null : String(r.address),
    message: r.message == null ? null : String(r.message),
    status: String(r.status),
    created_at,
  };
}

export async function listBookingRequestsPg(): Promise<{ rows: BookingRow[]; error?: string }> {
  try {
    const rows = await withPg(async (c) => {
      const r = await c.query(
        `select id, client_name, client_email, client_phone, booking_date::text as booking_date, booking_time,
                address, message, status, created_at
         from public.booking_requests
         order by case when status = 'pending' then 0 else 1 end, created_at desc`,
      );
      return r.rows.map(mapBookingRow);
    });
    return { rows };
  } catch (e) {
    return { rows: [], error: e instanceof Error ? e.message : String(e) };
  }
}

/** Load a pending booking for accept (before Google Calendar). */
export async function getPendingBookingForAcceptPg(
  id: string,
): Promise<{ ok: true; row: BookingRow } | { error: string; code: number }> {
  try {
    return await withPg(async (c) => {
      const sel = await c.query(
        `select id, client_name, client_email, client_phone, booking_date::text as booking_date, booking_time,
                address, message, status, created_at
         from public.booking_requests
         where id = $1`,
        [id],
      );
      if (sel.rows.length === 0) {
        return { error: "Not found", code: 404 };
      }
      const row = mapBookingRow(sel.rows[0]);
      if (row.status !== "pending") {
        return { error: "Booking is not pending", code: 409 };
      }
      return { ok: true, row };
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e), code: 500 };
  }
}

/** After Google Calendar succeeds: mark accepted and block the booking date. */
export async function markBookingAcceptedAndBlockDatePg(
  id: string,
): Promise<{ ok: true } | { error: string; code: number }> {
  try {
    return await withPg(async (c) => {
      await c.query("BEGIN");
      try {
        const u = await c.query(
          `update public.booking_requests
           set status = 'accepted'
           where id = $1 and status = 'pending'
           returning booking_date::text as booking_date`,
          [id],
        );
        if (u.rows.length === 0) {
          await c.query("ROLLBACK");
          const ex = await c.query(`select status from public.booking_requests where id = $1`, [id]);
          if (ex.rows.length === 0) return { error: "Not found", code: 404 };
          return { error: "Booking is not pending", code: 409 };
        }
        const dateStr = String(u.rows[0].booking_date).slice(0, 10);
        await c.query(
          `insert into public.blocked_dates ("date") values ($1::date) on conflict ("date") do nothing`,
          [dateStr],
        );
        await c.query("COMMIT");
        return { ok: true };
      } catch (e) {
        await c.query("ROLLBACK");
        throw e;
      }
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e), code: 500 };
  }
}

export async function declineBookingPg(
  id: string,
): Promise<{ ok: true } | { error: string; code: number }> {
  try {
    return await withPg(async (c) => {
      const u = await c.query(
        `update public.booking_requests
         set status = 'declined'
         where id = $1 and status = 'pending'
         returning id`,
        [id],
      );
      if (u.rows.length === 0) {
        const ex = await c.query(`select 1 from public.booking_requests where id = $1`, [id]);
        if (ex.rows.length === 0) return { error: "Not found", code: 404 };
        return { error: "Booking is not pending", code: 409 };
      }
      return { ok: true };
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e), code: 500 };
  }
}
