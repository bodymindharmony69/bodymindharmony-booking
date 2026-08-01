import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { requireEnv } from "../../../../lib/requireEnv";
import { requireGoogleRedirectUri } from "../../../../lib/googleRedirectUri";
import { requireAdminSecret } from "../../../../lib/adminRequest";
import { createGoogleOAuthState } from "../../../../lib/googleOAuthState";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const denied = requireAdminSecret(request);
  if (denied) return denied;
  try {
    const clientId = requireEnv("GOOGLE_CLIENT_ID");
    const clientSecret = requireEnv("GOOGLE_CLIENT_SECRET");
    const redirectUri = requireGoogleRedirectUri();

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["https://www.googleapis.com/auth/calendar.events"],
      state: createGoogleOAuthState(),
    });

    return NextResponse.json({ url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Missing Google OAuth configuration";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
