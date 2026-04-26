import Stripe from "stripe";

export type BookingForStripeCheckout = {
  id: string;
  client_name: string;
  booking_date: string;
  booking_time: string;
  final_price: number;
};

function requireStripeSecret(): string {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("Missing env: STRIPE_SECRET_KEY");
  return key;
}

function siteOrigin(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (!site) throw new Error("Missing env: NEXT_PUBLIC_SITE_URL");
  return site;
}

export async function createBookingPaymentLink(booking: BookingForStripeCheckout): Promise<string> {
  if (booking.final_price == null || !Number.isFinite(Number(booking.final_price))) {
    throw new Error("final_price is required for Stripe checkout");
  }
  const stripe = new Stripe(requireStripeSecret());
  const base = siteOrigin();
  const unitAmount = Math.round(Number(booking.final_price) * 100);
  if (!Number.isFinite(unitAmount) || unitAmount <= 0) {
    throw new Error("final_price must be a positive amount for Stripe checkout");
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "gbp",
          unit_amount: unitAmount,
          product_data: { name: "BodyMindHarmony Massage Booking" },
        },
      },
    ],
    success_url: `${base}/booking-success`,
    cancel_url: `${base}/booking-cancelled`,
    metadata: {
      booking_id: String(booking.id).slice(0, 500),
      client_name: String(booking.client_name).slice(0, 500),
      booking_date: String(booking.booking_date).slice(0, 500),
      booking_time: String(booking.booking_time).slice(0, 500),
    },
  });

  if (!session.url) throw new Error("Stripe Checkout did not return a URL");
  return session.url;
}
