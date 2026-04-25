import { NextResponse } from "next/server";
import { google } from "googleapis";
import { requireEnv } from "../../../../lib/requireEnv";

export const runtime = "nodejs";

export async function GET() {
  try {
    const clientId = requireEnv("GOOGLE_CLIENT_ID");
    const clientSecret = requireEnv("GOOGLE_CLIENT_SECRET");
    const redirectUri = requireEnv("GOOGLE_REDIRECT_URI");

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["https://www.googleapis.com/auth/calendar.events"],
    });

    return NextResponse.json({ url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Missing Google OAuth configuration";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
