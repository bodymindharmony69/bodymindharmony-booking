/** Time slots shown on the home page; server rejects any other time. */
export const BOOKING_TIME_SLOTS = [
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
] as const;

export type BookingTimeSlot = (typeof BOOKING_TIME_SLOTS)[number];

export function isValidCalendarDateYMD(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function todayInLondonYMD(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function isBookableDateYMD(value: string, now = new Date()): boolean {
  if (!isValidCalendarDateYMD(value)) return false;
  const today = todayInLondonYMD(now);
  const max = new Date(`${today}T12:00:00Z`);
  max.setUTCDate(max.getUTCDate() + 365);
  return value >= today && value <= max.toISOString().slice(0, 10);
}

export function isAllowedBookingTime(t: string): boolean {
  const x = t.trim();
  return (BOOKING_TIME_SLOTS as readonly string[]).includes(x);
}
