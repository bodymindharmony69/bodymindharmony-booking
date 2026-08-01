import { getBookingByStripeSessionPg, markBookingPaidPg } from "./bookingAdminPg";
import { sendBookingPaidEmail } from "./email";
import { createCalendarEvent } from "./googleCalendar";
import { createStripeClient } from "./stripe";

export async function fulfillCheckoutSession(sessionId: string): Promise<boolean> {
  if (!/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(sessionId)) {
    throw new Error("Invalid checkout session");
  }
  const stripe = createStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") return false;

  const booking = await getBookingByStripeSessionPg(session.id);
  if (!booking) throw new Error("Booking for checkout session not found");
  if (booking.payment_status === "paid") return true;
  if (session.metadata?.booking_id !== booking.id || session.client_reference_id !== booking.id) {
    throw new Error("Checkout session does not match booking");
  }

  const googleEventId = await createCalendarEvent({
    id: booking.id,
    client_name: booking.client_name,
    client_phone: booking.client_phone,
    client_email: booking.client_email,
    address: booking.address,
    message: booking.message,
    booking_date: booking.booking_date,
    booking_time: booking.booking_time,
    final_price: booking.final_price,
  });
  await markBookingPaidPg(booking.id, googleEventId);
  await sendBookingPaidEmail({ ...booking, id: booking.id });
  return true;
}
