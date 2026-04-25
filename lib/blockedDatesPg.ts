import { createSupabaseAdmin } from "./supabaseAdmin";

/** List blocked calendar days as YYYY-MM-DD strings. */
export async function listBlockedDatesYmd(): Promise<{ dates: string[]; error?: string }> {
  try {
    const sb = createSupabaseAdmin();
    const { data, error } = await sb.from("blocked_dates").select("date").order("date", { ascending: true });
    if (error) return { dates: [], error: error.message };
    const dates = (data ?? []).map((row) => {
      const v = (row as { date: string }).date;
      return typeof v === "string" ? v.slice(0, 10) : String(v).slice(0, 10);
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
    const sb = createSupabaseAdmin();
    const { data: existing, error: selErr } = await sb
      .from("blocked_dates")
      .select("id")
      .eq("date", date)
      .maybeSingle();
    if (selErr) return { blocked: false, error: selErr.message };

    if (existing) {
      const { error: delErr } = await sb.from("blocked_dates").delete().eq("date", date);
      if (delErr) return { blocked: false, error: delErr.message };
      return { blocked: false };
    }

    const { error: insErr } = await sb.from("blocked_dates").insert({ date });
    if (insErr) return { blocked: false, error: insErr.message };
    return { blocked: true };
  } catch (e) {
    return { blocked: false, error: e instanceof Error ? e.message : String(e) };
  }
}
