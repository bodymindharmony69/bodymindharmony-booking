import { NextRequest, NextResponse } from "next/server";
import { requireAdminSecret } from "../../../../../lib/adminRequest";

export const runtime = "nodejs";

const REDIRECT_URI = "https://www.bodymindharmony.co.uk/api/google/callback";

export async function GET(request: NextRequest) {
  const denied = requireAdminSecret(request);
  if (denied) return denied;

  return NextResponse.json({
    hasClientId: Boolean(process.env.GOOGLE_CLIENT_ID?.trim()),
    hasClientSecret: Boolean(process.env.GOOGLE_CLIENT_SECRET?.trim()),
    hasRedirectUri: Boolean(process.env.GOOGLE_REDIRECT_URI?.trim()),
    hasRefreshToken: Boolean(process.env.GOOGLE_REFRESH_TOKEN?.trim()),
    redirectUri: REDIRECT_URI,
  });
}
