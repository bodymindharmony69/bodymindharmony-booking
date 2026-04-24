import "./globals.css";

export const metadata = {
  title: "BodyMindHarmony Booking",
  description: "Booking request system for BodyMindHarmony",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
