import type { Metadata } from "next";

export const metadata: Metadata = { title: "Booking terms", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return (
    <main><article className="card legal">
      <h1>Booking terms</h1>
      <h2>Requests and confirmation</h2>
      <p>Submitting a form is a request, not a confirmed appointment. We review availability and travel distance, then provide the final price and a secure Stripe payment link. The appointment is confirmed only after payment is successfully received.</p>
      <h2>Service details</h2>
      <p>Please provide accurate contact and address information. Tell us before the appointment about accessibility needs or health information that may affect whether massage is suitable. This service does not replace medical advice.</p>
      <h2>Changes and cancellations</h2>
      <p>Contact BodyMindHarmony as soon as possible if you need to change or cancel. Any refund or rescheduling will consider the notice given, costs already incurred, and your rights under UK consumer law. We will not limit rights that cannot legally be excluded.</p>
      <h2>Problems</h2>
      <p>If we must cancel, we will offer a new time or refund the affected payment. Contact us by replying to your booking email if anything is wrong.</p>
      <p className="note">Last updated: 30 July 2026</p>
    </article></main>
  );
}
