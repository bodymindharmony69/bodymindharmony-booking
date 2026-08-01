import { fulfillCheckoutSession } from "../../lib/paymentFulfillment";

export const dynamic = "force-dynamic";

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const sessionId = (await searchParams).session_id ?? "";
  let paid = false;
  if (sessionId) {
    try {
      paid = await fulfillCheckoutSession(sessionId);
    } catch (error) {
      console.error("booking success fulfillment:", error);
    }
  }
  return (
    <main>
      <div className="card success">
        <h1>{paid ? "Booking confirmed" : "Payment processing"}</h1>
        <p>
          {paid
            ? "Payment was received and your BodyMindHarmony appointment is confirmed. A confirmation email is on its way."
            : "We have not confirmed the payment yet. If you paid, please wait a moment and check your email before trying again."}
        </p>
        <p className="note"><a href="/">Return to booking page</a></p>
      </div>
    </main>
  );
}
