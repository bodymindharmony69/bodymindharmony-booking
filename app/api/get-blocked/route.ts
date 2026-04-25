import { NextResponse } from "next/server";
import { listBlockedDatesYmd } from "../../../lib/blockedDatesPg";

export const runtime = "nodejs";

/** Public read of blocked dates via Postgres (reliable vs PostgREST schema cache). */
export async function GET() {
  const { dates, error } = await listBlockedDatesYmd();
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
  return NextResponse.json({ blockedDates: dates });
}
