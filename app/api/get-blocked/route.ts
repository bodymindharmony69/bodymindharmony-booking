import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

/** Public read of blocked dates; uses service role server-side only (key never exposed). */
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("blocked_dates")
    .select("date")
    .order("date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const blockedDates = (data ?? []).map((row) =>
    typeof row.date === "string" ? row.date : String(row.date).slice(0, 10),
  );

  return NextResponse.json({ blockedDates });
}
