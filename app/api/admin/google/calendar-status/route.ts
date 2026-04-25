import { NextRequest, NextResponse } from "next/server";
import { requireAdminSecret } from "../../../../../lib/adminRequest";
import { isGoogleCalendarConfigured } from "../../../../../lib/googleCalendar";

export const runtime = "nodejs";

function requestOrigin(request: NextRequest): string {
  const hostRaw = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const host = hostRaw?.split(",")[0]?.trim();
  const proto = (request.headers.get("x-forwarded-proto") ?? "https").split(",")[0]?.trim() ?? "https";
  if (host) return `${proto}://${host}`;
  return "";
}

function normalizeUrl(u: string): string {
  return u.replace(/\/+$/, "").trim();
}

export async function GET(request: NextRequest) {
  const denied = requireAdminSecret(request);
  if (denied) return denied;

  const clientId = Boolean(process.env.GOOGLE_CLIENT_ID?.trim());
  const clientSecret = Boolean(process.env.GOOGLE_CLIENT_SECRET?.trim());
  const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim() ?? "";
  const refreshToken = Boolean(process.env.GOOGLE_REFRESH_TOKEN?.trim());

  const origin = requestOrigin(request);
  const suggestedRedirectUri = origin ? `${origin}/api/google/callback` : "";
  const redirectMatches =
    Boolean(redirectUri && suggestedRedirectUri) &&
    normalizeUrl(redirectUri) === normalizeUrl(suggestedRedirectUri);

  return NextResponse.json({
    connected: isGoogleCalendarConfigured(),
    hasClientId: clientId,
    hasClientSecret: clientSecret,
    hasRedirectUri: Boolean(redirectUri),
    hasRefreshToken: refreshToken,
    suggestedRedirectUri,
    redirectMatches,
  });
}
