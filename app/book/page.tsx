"use client";

import { useState } from "react";
import { BOOKING_TIME_SLOTS, isValidCalendarDateYMD } from "../../lib/bookingRules";

export default function BookPage() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const client_name = String(fd.get("name") ?? "").trim();
    const client_email = String(fd.get("client_email") ?? "").trim();
    const client_phone = String(fd.get("phone") ?? "").trim();
    const booking_date = String(fd.get("date") ?? "").trim();
    const booking_time = String(fd.get("time") ?? "").trim();
    const address = String(fd.get("address") ?? "").trim();
    const message = String(fd.get("message") ?? "").trim();

    if (!isValidCalendarDateYMD(booking_date)) {
      setLoading(false);
      setError("Please choose a valid date (YYYY-MM-DD).");
      return;
    }

    const res = await fetch("/api/booking-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_name,
        client_email: client_email || null,
        client_phone: client_phone || null,
        booking_date,
        booking_time,
        address: address || null,
        message: message || null,
      }),
    });
    setLoading(false);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof j.error === "string" ? j.error : "Request failed.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <main>
        <div className="card">
          <h1>Request sent</h1>
          <p className="note">
            Your booking request has been sent. I&apos;ll confirm after checking availability and travel distance.
          </p>
          <p className="note">
            <a href="/book" style={{ color: "#8af" }}>
              Submit another
            </a>
            {" · "}
            <a href="/" style={{ color: "#aaa" }}>
              Full calendar booking
            </a>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="card">
        <h1>Book</h1>
        <p className="note">Mobile-friendly request form. Same server checks as the main booking page.</p>
        {error ? <p className="admin-login-error">{error}</p> : null}
        <form onSubmit={onSubmit} className="book-form">
          <label>
            Name *
            <input name="name" required autoComplete="name" />
          </label>
            <label>
            Email
            <input name="client_email" type="email" autoComplete="email" />
          </label>
          <label>
            Phone
            <input name="phone" type="tel" autoComplete="tel" />
          </label>
          <label>
            Date * (YYYY-MM-DD)
            <input name="date" type="date" required />
          </label>
          <label>
            Time *
            <select name="time" required defaultValue="">
              <option value="" disabled>
                Select time
              </option>
              {BOOKING_TIME_SLOTS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label>
            Address / postcode
            <input name="address" autoComplete="street-address" />
          </label>
          <label>
            Message
            <textarea name="message" rows={4} />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? "Sending…" : "Send request"}
          </button>
        </form>
        <p className="note" style={{ marginTop: 16 }}>
          <a href="/" style={{ color: "#aaa" }}>
            ← Calendar booking
          </a>
        </p>
      </div>
    </main>
  );
}
