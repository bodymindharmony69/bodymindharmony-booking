import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy notice", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <main><article className="card legal">
      <h1>Privacy notice</h1>
      <p>BodyMindHarmony is responsible for the personal information collected through this booking service.</p>
      <h2>What we collect and why</h2>
      <p>We collect your name, contact details, requested date and time, service address, message, payment status, and booking history so we can review your request, provide the service, take payment, prevent misuse, and keep necessary business records. The main lawful basis is taking steps at your request and performing our contract. Security and record-keeping also support our legitimate interests and legal duties.</p>
      <h2>Who receives it</h2>
      <p>Information is shared only as needed with our booking database and hosting providers, email provider, Stripe for payment, and Google Calendar. Those providers process information under their own security and privacy arrangements. We do not sell your information.</p>
      <h2>How long we keep it</h2>
      <p>Unsuccessful booking requests are normally deleted within 12 months. Completed booking and payment records may be retained for up to six years where needed for tax, accounting, disputes, or legal obligations.</p>
      <h2>Your rights</h2>
      <p>You may ask for access, correction, deletion, restriction, or portability, or object to some uses. Contact us by replying to a BodyMindHarmony booking email. You may also complain to the UK Information Commissioner’s Office.</p>
      <p className="note">Last updated: 30 July 2026</p>
    </article></main>
  );
}
