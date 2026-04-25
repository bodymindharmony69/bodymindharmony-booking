import { NextRequest, NextResponse } from "next/server";
import { requireAdminSecret } from "../../../../../lib/adminRequest";
import { getGoogleRedirectUri } from "../../../../../lib/googleRedirectUri";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const denied = requireAdminSecret(request);
  if (denied) return denied;

  const effectiveRedirect = getGoogleRedirectUri();

  return NextResponse.json({
    hasClientId: Boolean(process.env.GOOGLE_CLIENT_ID?.trim()),
    hasClientSecret: Boolean(process.env.GOOGLE_CLIENT_SECRET?.trim()),
    hasRedirectUriEnv: Boolean(process.env.GOOGLE_REDIRECT_URI?.trim()),
    hasRedirectUriEffective: Boolean(effectiveRedirect),
    hasRefreshToken: Boolean(process.env.GOOGLE_REFRESH_TOKEN?.trim()),
    redirectUri: effectiveRedirect ?? null,
  });
}
