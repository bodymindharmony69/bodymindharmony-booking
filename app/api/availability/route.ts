import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from '../../../lib/supabaseAdmin'
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("blocked_dates")
    .select("date")
    .order("date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ blockedDates: data.map((item) => item.date) });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const password = request.headers.get("x-admin-password");
  const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

  if (!adminPassword || password !== adminPassword) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const date = body.date;

  if (!date) {
    return NextResponse.json({ error: "Date is required" }, { status: 400 });
  }

  const { data: existing } = await supabaseAdmin
    .from("blocked_dates")
    .select("date")
    .eq("date", date)
    .maybeSingle();

  if (existing) {
    const { error } = await supabaseAdmin
      .from("blocked_dates")
      .delete()
      .eq("date", date);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ date, blocked: false });
  }

  const { error } = await supabaseAdmin
    .from("blocked_dates")
    .insert({ date });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ date, blocked: true });
}
