import { google } from "googleapis";

export function isGoogleCalendarConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim() &&
      process.env.GOOGLE_REDIRECT_URI?.trim() &&
      process.env.GOOGLE_REFRESH_TOKEN?.trim(),
  );
}

export type BookingForCalendar = {
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  address: string | null;
  message: string | null;
  booking_date: string;
  booking_time: string;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Wall-clock start in Europe/London (no offset in string; API uses timeZone). */
function startDateTime(dateStr: string, timeStr: string): string {
  const [hh, mmRaw] = timeStr.trim().split(":");
  const hhNum = parseInt(hh, 10);
  const mmNum = parseInt(mmRaw ?? "0", 10) || 0;
  return `${dateStr}T${pad2(hhNum)}:${pad2(mmNum)}:00`;
}

/** Two hours after start on the wall clock (may roll to next calendar day). */
function endDateTime(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split("-").map((x) => parseInt(x, 10));
  const [hh, mmRaw] = timeStr.trim().split(":");
  const startMins = parseInt(hh, 10) * 60 + (parseInt(mmRaw ?? "0", 10) || 0);
  const total = startMins + 120;
  const dayOffset = Math.floor(total / (24 * 60));
  const rem = total % (24 * 60);
  const endH = Math.floor(rem / 60);
  const endM = rem % 60;
  const endDay = new Date(Date.UTC(y, m - 1, d + dayOffset));
  return `${endDay.getUTCFullYear()}-${pad2(endDay.getUTCMonth() + 1)}-${pad2(endDay.getUTCDate())}T${pad2(endH)}:${pad2(endM)}:00`;
}

function buildDescription(b: BookingForCalendar): string {
  const lines = [
    `Phone: ${b.client_phone ?? ""}`,
    `Email: ${b.client_email ?? ""}`,
    `Address: ${b.address ?? ""}`,
    "",
    b.message ?? "",
  ];
  return lines.join("\n");
}

export async function createCalendarEvent(booking: BookingForCalendar): Promise<void> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN?.trim();
  if (!clientId || !clientSecret || !redirectUri || !refreshToken) {
    throw new Error("Missing Google Calendar OAuth environment variables.");
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  const start = startDateTime(booking.booking_date, booking.booking_time);
  const end = endDateTime(booking.booking_date, booking.booking_time);

  await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: `BodyMindHarmony massage - ${booking.client_name}`,
      description: buildDescription(booking),
      location: booking.address ?? "",
      start: { dateTime: start, timeZone: "Europe/London" },
      end: { dateTime: end, timeZone: "Europe/London" },
    },
  });
}
