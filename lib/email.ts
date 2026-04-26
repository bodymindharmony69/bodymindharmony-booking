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

/**
 * Sends the same customer-facing message to the client first, then to ADMIN_EMAIL as a copy.
 * Two separate Resend calls so dashboards show correct TO per message.
 */
async function sendResendCustomerCopyToClientThenAdmin(params: {
  from: string;
  subject: string;
  text: string;
  clientEmail: string | null | undefined;
}): Promise<void> {
  const resend = resendClient();
  if (!resend) throw new Error("Missing Resend client");

  const client = params.clientEmail?.trim() || "";
  const admin = adminEmail()?.trim() || "";
  const recipients: string[] = [];
  if (client) recipients.push(client);
  if (admin && (!client || admin.toLowerCase() !== client.toLowerCase())) {
    recipients.push(admin);
  }
  console.log("EMAIL RECIPIENTS:", recipients);

  if (client) {
    await resend.emails.send({
      from: params.from,
      to: client,
      subject: params.subject,
      text: params.text,
    });
  }
  if (admin && (!client || admin.toLowerCase() !== client.toLowerCase())) {
    await resend.emails.send({
      from: params.from,
      to: admin,
      subject: params.subject,
      text: params.text,
    });
  }
  if (!client && !admin) {
    throw new Error("No recipients");
  }
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

    console.log("Sending email to:", booking.client_email);
    try {
      await sendResendCustomerCopyToClientThenAdmin({
        from,
        subject: "BodyMindHarmony booking request received",
        text,
        clientEmail: booking.client_email,
      });
    } catch (e) {
      if (e instanceof Error && e.message === "No recipients") {
        return { skipped: true, reason: "No recipients" };
      }
      throw e;
    }
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

    console.log("Sending email to:", booking.client_email);
    try {
      await sendResendCustomerCopyToClientThenAdmin({
        from,
        subject: "BodyMindHarmony booking confirmed",
        text,
        clientEmail: booking.client_email,
      });
    } catch (e) {
      if (e instanceof Error && e.message === "No recipients") {
        return { skipped: true, reason: "No recipients" };
      }
      throw e;
    }
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
