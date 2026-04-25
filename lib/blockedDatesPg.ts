import { withPg } from "./pgFromEnv";

/** List blocked calendar days as YYYY-MM-DD strings. */
export async function listBlockedDatesYmd(): Promise<{ dates: string[]; error?: string }> {
  try {
    const dates = await withPg(async (c) => {
      const r = await c.query(
        `select "date"::text as d from public.blocked_dates order by "date" asc`,
      );
      return r.rows.map((row) => String(row.d).slice(0, 10));
    });
    return { dates };
  } catch (e) {
    return { dates: [], error: e instanceof Error ? e.message : String(e) };
  }
}

/** Insert blocked date, or delete if already blocked. Returns new blocked state. */
export async function toggleBlockedDateYmd(
  date: string,
): Promise<{ blocked: boolean; error?: string }> {
  try {
    return await withPg(async (c) => {
      const chk = await c.query(
        `select 1 from public.blocked_dates where "date" = $1::date limit 1`,
        [date],
      );
      if (chk.rows.length > 0) {
        await c.query(`delete from public.blocked_dates where "date" = $1::date`, [date]);
        return { blocked: false };
      }
      await c.query(`insert into public.blocked_dates ("date") values ($1::date)`, [date]);
      return { blocked: true };
    });
  } catch (e) {
    return { blocked: false, error: e instanceof Error ? e.message : String(e) };
  }
}
