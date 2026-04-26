import { Resend } from "resend";

export type BookingRequestEmailFields = {
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  booking_date: string;
  booking_time: string;
  address: string | null;
  message: string | null;
  status: string;
};

export type BookingAcceptedEmailFields = BookingRequestEmailFields & {
  final_price: number | string | null;
  payment_url: string | null;
};

export type EmailResult =
  | { skipped: true; reason: string }
  | { ok: true }
  | { error: string };

export function hasEmailEnv(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.FROM_EMAIL?.trim());
}

function adminEmail(): string | null {
  const v = process.env.ADMIN_EMAIL?.trim();
  return v || null;
}

function fromAddress(): string | null {
  const v = process.env.FROM_EMAIL?.trim();
  return v || null;
}

function formatPrice(p: number | string | null | undefined): string {
  if (p == null || p === "") return "—";
  const n = typeof p === "number" ? p : parseFloat(String(p).replace(/[£,\s]/g, ""));
  if (!Number.isFinite(n)) return "—";
  return `£${n.toFixed(2)}`;
}

function resendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  return new Resend(key);
}

/** Client first; include admin as copy when both exist. Admin-only when no client email. */
function recipientsClientPlusAdminCopy(clientEmail: string | null | undefined): string[] | null {
  const c = clientEmail?.trim() || "";
  const a = adminEmail()?.trim() || "";
  if (c && a) {
    if (c.toLowerCase() === a.toLowerCase()) return [c];
    return [c, a];
  }
  if (c) return [c];
  if (a) return [a];
  return null;
}

export async function sendBookingReceivedEmail(booking: BookingRequestEmailFields): Promise<EmailResult> {
  try {
    if (!hasEmailEnv()) {
      console.warn("[email] Missing RESEND_API_KEY or FROM_EMAIL; skip sendBookingReceivedEmail");
      return { skipped: true, reason: "Missing email env" };
    }
    const from = fromAddress();
    if (!from) {
      return { skipped: true, reason: "Missing email env" };
    }

    const to = recipientsClientPlusAdminCopy(booking.client_email);
    if (!to || to.length === 0) {
      return { skipped: true, reason: "No recipients" };
    }

    const text =
      `Hi ${booking.client_name},\n\n` +
      `Thank you for your booking request.\n\n` +
      `I have received your request for:\n` +
      `Date: ${booking.booking_date}\n` +
      `Time: ${booking.booking_time}\n` +
      `Address: ${booking.address ?? ""}\n\n` +
      `I will check availability and travel distance, then confirm your booking personally.\n\n` +
      `Love,\n` +
      `BodyMindHarmony`;

    const resend = resendClient();
    if (!resend) return { skipped: true, reason: "Missing email env" };

    console.log("Sending email to:", booking.client_email);
    await resend.emails.send({
      from,
      to,
      subject: "BodyMindHarmony booking request received",
      text,
    });
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[email] sendBookingReceivedEmail:", message);
    return { error: message };
  }
}

export async function sendAdminBookingNotification(booking: BookingRequestEmailFields): Promise<EmailResult> {
  try {
    if (!hasEmailEnv()) {
      console.warn("[email] Missing RESEND_API_KEY or FROM_EMAIL; skip sendAdminBookingNotification");
      return { skipped: true, reason: "Missing email env" };
    }
    const adminTo = adminEmail();
    if (!adminTo) {
      return { skipped: true, reason: "No admin email" };
    }
    const from = fromAddress();
    if (!from) {
      return { skipped: true, reason: "Missing email env" };
    }

    const text =
      `New BodyMindHarmony booking request\n\n` +
      `Name: ${booking.client_name}\n` +
      `Email: ${booking.client_email ?? ""}\n` +
      `Phone: ${booking.client_phone ?? ""}\n` +
      `Date: ${booking.booking_date}\n` +
      `Time: ${booking.booking_time}\n` +
      `Address: ${booking.address ?? ""}\n` +
      `Message: ${booking.message ?? ""}\n` +
      `Status: ${booking.status}\n`;

    const resend = resendClient();
    if (!resend) return { skipped: true, reason: "Missing email env" };

    await resend.emails.send({
      from,
      to: adminTo,
      subject: "New BodyMindHarmony booking request",
      text,
    });
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[email] sendAdminBookingNotification:", message);
    return { error: message };
  }
}

export async function sendBookingAcceptedEmail(booking: BookingAcceptedEmailFields): Promise<EmailResult> {
  try {
    if (!hasEmailEnv()) {
      console.warn("[email] Missing RESEND_API_KEY or FROM_EMAIL; skip sendBookingAcceptedEmail");
      return { skipped: true, reason: "Missing email env" };
    }
    const from = fromAddress();
    if (!from) {
      return { skipped: true, reason: "Missing email env" };
    }

    const to = recipientsClientPlusAdminCopy(booking.client_email);
    if (!to || to.length === 0) {
      return { skipped: true, reason: "No recipients" };
    }

    const pay = (booking.payment_url ?? "").trim();
    const price = formatPrice(booking.final_price);

    const text =
      `Hi ${booking.client_name},\n\n` +
      `Your BodyMindHarmony booking has been confirmed.\n\n` +
      `Date:\n${booking.booking_date}\n\n` +
      `Time:\n${booking.booking_time}\n\n` +
      `Address:\n${booking.address ?? ""}\n\n` +
      `Final price:\n${price}\n\n` +
      `Payment link:\n${pay || "—"}\n\n` +
      `Please complete payment here:\n${pay || "(link unavailable)"}\n\n` +
      `Love,\n` +
      `BodyMindHarmony`;

    const resend = resendClient();
    if (!resend) return { skipped: true, reason: "Missing email env" };

    console.log("Sending email to:", booking.client_email);
    await resend.emails.send({
      from,
      to,
      subject: "BodyMindHarmony booking confirmed",
      text,
    });
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[email] sendBookingAcceptedEmail:", message);
    return { error: message };
  }
}

export async function sendAdminBookingAcceptedNotification(
  booking: BookingAcceptedEmailFields,
): Promise<EmailResult> {
  try {
    if (!hasEmailEnv()) {
      console.warn("[email] Missing RESEND_API_KEY or FROM_EMAIL; skip sendAdminBookingAcceptedNotification");
      return { skipped: true, reason: "Missing email env" };
    }
    const adminTo = adminEmail();
    if (!adminTo) {
      return { skipped: true, reason: "No admin email" };
    }
    const from = fromAddress();
    if (!from) {
      return { skipped: true, reason: "Missing email env" };
    }

    const pay = (booking.payment_url ?? "").trim();
    const price = formatPrice(booking.final_price);

    const text =
      `BodyMindHarmony booking accepted\n\n` +
      `Name: ${booking.client_name}\n` +
      `Email: ${booking.client_email ?? ""}\n` +
      `Phone: ${booking.client_phone ?? ""}\n` +
      `Date: ${booking.booking_date}\n` +
      `Time: ${booking.booking_time}\n` +
      `Address: ${booking.address ?? ""}\n` +
      `Final price: ${price}\n` +
      `Payment URL: ${pay || "—"}\n` +
      `Google Calendar created: yes\n`;

    const resend = resendClient();
    if (!resend) return { skipped: true, reason: "Missing email env" };

    await resend.emails.send({
      from,
      to: adminTo,
      subject: "BodyMindHarmony booking accepted",
      text,
    });
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[email] sendAdminBookingAcceptedNotification:", message);
    return { error: message };
  }
}
