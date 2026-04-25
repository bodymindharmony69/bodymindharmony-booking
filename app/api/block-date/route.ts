import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { requireAdminSecret } from "../../../lib/adminRequest";

function isValidCalendarDateYMD(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export async function POST(request: NextRequest) {
  const denied = requireAdminSecret(request);
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const date = typeof body?.date === "string" ? body.date.trim() : "";

  if (!date || !isValidCalendarDateYMD(date)) {
    return NextResponse.json({ error: "date is required (YYYY-MM-DD)" }, { status: 400 });
  }

  const { data: existing } = await supabaseAdmin
    .from("blocked_dates")
    .select("date")
    .eq("date", date)
    .maybeSingle();

  if (existing) {
    const { error } = await supabaseAdmin.from("blocked_dates").delete().eq("date", date);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ date, blocked: false });
  }

  const { error } = await supabaseAdmin.from("blocked_dates").insert({ date });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ date, blocked: true });
}
