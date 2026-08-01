import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.bodymindharmony.co.uk"),
  title: { default: "BodyMindHarmony Massage Booking", template: "%s | BodyMindHarmony" },
  description: "Request a BodyMindHarmony mobile massage appointment securely online.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "BodyMindHarmony Massage Booking",
    description: "Request a mobile massage appointment securely online.",
    url: "/",
    siteName: "BodyMindHarmony",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <footer><a href="/privacy">Privacy</a><a href="/terms">Booking terms</a></footer>
      </body>
    </html>
  );
}
