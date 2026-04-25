import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export async function POST(request: NextRequest) {
  const expected = process.env.ADMIN_SECRET?.trim();
  const headerSecret = request.headers.get("x-admin-secret");

  if (!expected || headerSecret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const date = body?.date;

  if (!date || typeof date !== "string") {
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
