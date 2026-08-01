import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { fulfillCheckoutSession } from "../../../../lib/paymentFulfillment";
import { createStripeClient } from "../../../../lib/stripe";
import { releaseExpiredBookingPg } from "../../../../lib/bookingAdminPg";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const signature = request.headers.get("stripe-signature");
  if (!webhookSecret || !signature) {
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = createStripeClient().webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    await fulfillCheckoutSession((event.data.object as Stripe.Checkout.Session).id);
  } else if (event.type === "checkout.session.expired") {
    await releaseExpiredBookingPg((event.data.object as Stripe.Checkout.Session).id);
  }
  return NextResponse.json({ received: true });
}
