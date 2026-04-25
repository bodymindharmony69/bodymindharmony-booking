import { NextRequest, NextResponse } from "next/server";
import { requireAdminSecret } from "../../../../../lib/adminRequest";
import { isGoogleCalendarConfigured } from "../../../../../lib/googleCalendar";

export const runtime = "nodejs";

const SUGGESTED_REDIRECT_URI = "https://www.bodymindharmony.co.uk/api/google/callback";

function normalizeUrl(u: string): string {
  return u.replace(/\/+$/, "").trim();
}

export async function GET(request: NextRequest) {
  const denied = requireAdminSecret(request);
  if (denied) return denied;

  const GOOGLE_CLIENT_ID = Boolean(process.env.GOOGLE_CLIENT_ID?.trim());
  const GOOGLE_CLIENT_SECRET = Boolean(process.env.GOOGLE_CLIENT_SECRET?.trim());
  const GOOGLE_REDIRECT_URI = Boolean(process.env.GOOGLE_REDIRECT_URI?.trim());
  const GOOGLE_REFRESH_TOKEN = Boolean(process.env.GOOGLE_REFRESH_TOKEN?.trim());

  const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim() ?? "";
  const redirectMatches =
    Boolean(redirectUri) && normalizeUrl(redirectUri) === normalizeUrl(SUGGESTED_REDIRECT_URI);

  return NextResponse.json({
    suggestedRedirectUri: SUGGESTED_REDIRECT_URI,
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
    GOOGLE_REFRESH_TOKEN,
    connected: isGoogleCalendarConfigured(),
    redirectMatches,
  });
}
