import { NextRequest, NextResponse } from "next/server";
import { requireAdminSecret } from "../../../lib/adminRequest";
import { isValidCalendarDateYMD } from "../../../lib/bookingRules";
import { toggleBlockedDateYmd } from "../../../lib/blockedDatesPg";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const denied = requireAdminSecret(request);
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const date = typeof body?.date === "string" ? body.date.trim() : "";

  if (!date || !isValidCalendarDateYMD(date)) {
    return NextResponse.json({ error: "date is required (YYYY-MM-DD)" }, { status: 400 });
  }

  const { blocked, error } = await toggleBlockedDateYmd(date);
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ date, blocked });
}
