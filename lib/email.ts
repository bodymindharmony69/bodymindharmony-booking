import { Resend } from "resend";

export type BookingEmailPayload = {
  client_name: string;
  client_email: string | null;
  booking_date: string;
  booking_time: string;
  address: string | null;
  final_price?: number | string | null;
};

export type EmailSendResult = { skipped: boolean };

function fromAddress(): string | null {
  const v = process.env.FROM_EMAIL?.trim();
  return v || null;
}

function formatPrice(p: number | string | null | undefined): string | null {
  if (p == null || p === "") return null;
  const n = typeof p === "number" ? p : parseFloat(String(p).replace(/[£,\s]/g, ""));
  if (!Number.isFinite(n)) return null;
  return n.toFixed(2);
}

export async function sendBookingReceivedEmail(booking: BookingEmailPayload): Promise<EmailSendResult> {
  if (!process.env.RESEND_API_KEY?.trim()) {
    console.warn("[email] RESEND_API_KEY missing; skip sendBookingReceivedEmail");
    return { skipped: true };
  }
  const to = booking.client_email?.trim();
  if (!to) {
    return { skipped: true };
  }
  const from = fromAddress();
  if (!from) {
    console.warn("[email] FROM_EMAIL missing; skip sendBookingReceivedEmail");
    return { skipped: true };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const text =
    `Hi ${booking.client_name},\n\n` +
    `Thank you for your booking request.\n` +
    `I have received your request for:\n` +
    `Date: ${booking.booking_date}\n` +
    `Time: ${booking.booking_time}\n` +
    `Address: ${booking.address ?? ""}\n\n` +
    `I will check availability and travel distance, then confirm your booking personally.\n\n` +
    `Love,\n` +
    `BodyMindHarmony`;

  try {
    await resend.emails.send({
      from,
      to,
      subject: "BodyMindHarmony booking request received",
      text,
    });
    return { skipped: false };
  } catch (e) {
    console.error("[email] sendBookingReceivedEmail:", e);
    return { skipped: false };
  }
}

export async function sendBookingAcceptedEmail(booking: BookingEmailPayload): Promise<EmailSendResult> {
  if (!process.env.RESEND_API_KEY?.trim()) {
    console.warn("[email] RESEND_API_KEY missing; skip sendBookingAcceptedEmail");
    return { skipped: true };
  }
  const to = booking.client_email?.trim();
  if (!to) {
    return { skipped: true };
  }
  const from = fromAddress();
  if (!from) {
    console.warn("[email] FROM_EMAIL missing; skip sendBookingAcceptedEmail");
    return { skipped: true };
  }

  const priceStr = formatPrice(booking.final_price);
  const priceLine =
    priceStr != null ? `Final price: £${priceStr}\n` : "";

  const text =
    `Hi ${booking.client_name},\n\n` +
    `Your BodyMindHarmony booking has been confirmed.\n` +
    `Date: ${booking.booking_date}\n` +
    `Time: ${booking.booking_time}\n` +
    `Address: ${booking.address ?? ""}\n` +
    priceLine +
    `\nI look forward to seeing you.\n\n` +
    `Love,\n` +
    `BodyMindHarmony`;

  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    await resend.emails.send({
      from,
      to,
      subject: "BodyMindHarmony booking confirmed",
      text,
    });
    return { skipped: false };
  } catch (e) {
    console.error("[email] sendBookingAcceptedEmail:", e);
    return { skipped: false };
  }
}
