import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { requireEnv } from "../../../../lib/requireEnv";
import { requireGoogleRedirectUri } from "../../../../lib/googleRedirectUri";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  let clientId: string;
  let clientSecret: string;
  let redirectUri: string;
  try {
    clientId = requireEnv("GOOGLE_CLIENT_ID");
    clientSecret = requireEnv("GOOGLE_CLIENT_SECRET");
    redirectUri = requireGoogleRedirectUri();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Missing Google OAuth env vars.";
    return new NextResponse(msg, { status: 500 });
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return new NextResponse("Missing code query parameter.", { status: 400 });
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const { tokens } = await oauth2Client.getToken(code);
  const refresh = tokens.refresh_token ?? "(no refresh token returned — revoke app access in Google Account and try again with prompt=consent)";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Google refresh token</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 640px; margin: 24px auto; padding: 0 16px; line-height: 1.5; }
    .warn { background: #fff3cd; border: 1px solid #ffc107; padding: 12px; border-radius: 8px; margin: 16px 0; }
    pre { background: #f5f5f5; padding: 12px; overflow-x: auto; word-break: break-all; border-radius: 8px; }
  </style>
</head>
<body>
  <h1>Refresh token</h1>
  <p class="warn"><strong>Copy this into Vercel as GOOGLE_REFRESH_TOKEN. Do not share it.</strong></p>
  <pre>${escapeHtml(refresh)}</pre>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
