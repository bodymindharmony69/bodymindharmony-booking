import { google } from "googleapis";
import { requireEnv } from "./requireEnv";
import { getGoogleRedirectUri, requireGoogleRedirectUri } from "./googleRedirectUri";

export type BookingForCalendar = {
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  address: string | null;
  message: string | null;
  booking_date: string;
  booking_time: string;
  final_price?: number | string | null;
};

export function listMissingGoogleCalendarEnv(): string[] {
  const missing: string[] = [];
  if (!process.env.GOOGLE_CLIENT_ID?.trim()) missing.push("GOOGLE_CLIENT_ID");
  if (!process.env.GOOGLE_CLIENT_SECRET?.trim()) missing.push("GOOGLE_CLIENT_SECRET");
  if (!getGoogleRedirectUri()) missing.push("GOOGLE_REDIRECT_URI (or NEXT_PUBLIC_SITE_URL / SITE_URL / Vercel host)");
  if (!process.env.GOOGLE_REFRESH_TOKEN?.trim()) missing.push("GOOGLE_REFRESH_TOKEN");
  return missing;
}

export function isGoogleCalendarConfigured(): boolean {
  return listMissingGoogleCalendarEnv().length === 0;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function startDateTime(dateStr: string, timeStr: string): string {
  const [hh, mmRaw] = timeStr.trim().split(":");
  const hhNum = parseInt(hh, 10);
  const mmNum = parseInt(mmRaw ?? "0", 10) || 0;
  if (!Number.isFinite(hhNum) || !Number.isFinite(mmNum) || hhNum < 0 || hhNum > 23 || mmNum < 0 || mmNum > 59) {
    throw new Error(`Invalid booking time: ${timeStr}`);
  }
  return `${dateStr}T${pad2(hhNum)}:${pad2(mmNum)}:00`;
}

function endDateTime(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split("-").map((x) => parseInt(x, 10));
  const [hh, mmRaw] = timeStr.trim().split(":");
  const hhNum = parseInt(hh, 10);
  const mmNum = parseInt(mmRaw ?? "0", 10) || 0;
  if (![y, m, d].every((n) => Number.isFinite(n)) || !Number.isFinite(hhNum) || !Number.isFinite(mmNum)) {
    throw new Error(`Invalid date or time: ${dateStr} ${timeStr}`);
  }
  const startMins = hhNum * 60 + mmNum;
  const total = startMins + 120;
  const dayOffset = Math.floor(total / (24 * 60));
  const rem = total % (24 * 60);
  const endH = Math.floor(rem / 60);
  const endM = rem % 60;
  const endDay = new Date(Date.UTC(y, m - 1, d + dayOffset));
  return `${endDay.getUTCFullYear()}-${pad2(endDay.getUTCMonth() + 1)}-${pad2(endDay.getUTCDate())}T${pad2(endH)}:${pad2(endM)}:00`;
}

function formatFinalPrice(p: number | string | null | undefined): string | null {
  if (p == null || p === "") return null;
  const n = typeof p === "number" ? p : parseFloat(String(p).replace(/[£,\s]/g, ""));
  if (!Number.isFinite(n)) return null;
  return `£${n.toFixed(2)}`;
}

function buildDescription(b: BookingForCalendar): string {
  const priceLine = formatFinalPrice(b.final_price);
  return [
    `Name: ${b.client_name}`,
    `Phone: ${b.client_phone ?? ""}`,
    `Email: ${b.client_email ?? ""}`,
    `Address: ${b.address ?? ""}`,
    `Message: ${b.message ?? ""}`,
    priceLine ? `Final price: ${priceLine}` : "",
    "",
    `Date: ${b.booking_date}`,
    `Time: ${b.booking_time}`,
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export async function createCalendarEvent(booking: BookingForCalendar): Promise<void> {
  const missing = listMissingGoogleCalendarEnv();
  if (missing.length > 0) {
    throw new Error(`Missing Google Calendar environment variables: ${missing.join(", ")}`);
  }

  const clientId = requireEnv("GOOGLE_CLIENT_ID");
  const clientSecret = requireEnv("GOOGLE_CLIENT_SECRET");
  const redirectUri = requireGoogleRedirectUri();
  const refreshToken = requireEnv("GOOGLE_REFRESH_TOKEN");

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  const start = startDateTime(booking.booking_date, booking.booking_time);
  const end = endDateTime(booking.booking_date, booking.booking_time);

  try {
    await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: `BodyMindHarmony Massage - ${booking.client_name}`,
        description: buildDescription(booking),
        location: booking.address ?? "",
        start: { dateTime: start, timeZone: "Europe/London" },
        end: { dateTime: end, timeZone: "Europe/London" },
      },
    });
  } catch (e) {
    const msg =
      e && typeof e === "object" && "message" in e
        ? String((e as { message: unknown }).message)
        : e instanceof Error
          ? e.message
          : String(e);
    throw new Error(`Google Calendar API error: ${msg}`);
  }
}
