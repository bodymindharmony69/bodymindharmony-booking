"use client";

import { useEffect, useState } from "react";
import { BOOKING_TIME_SLOTS } from "../lib/bookingRules";

function toYmd(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function BookingPage() {
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [availabilityError, setAvailabilityError] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [step, setStep] = useState<"calendar" | "details" | "done">("calendar");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setCurrentDate(new Date());
    fetch("/api/get-blocked", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Availability is temporarily unavailable.");
        return res.json();
      })
      .then((data) => setBlockedDates(Array.isArray(data.blockedDates) ? data.blockedDates : []))
      .catch(() => setAvailabilityError("Availability is temporarily unavailable. Please try again shortly."));
  }, []);

  async function submitBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/booking-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: String(form.get("name") ?? "").trim(),
          client_email: String(form.get("email") ?? "").trim(),
          client_phone: String(form.get("phone") ?? "").trim(),
          booking_date: selectedDate,
          booking_time: selectedTime,
          address: String(form.get("address") ?? "").trim(),
          message: String(form.get("message") ?? "").trim(),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Request failed.");
      setStep("done");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  if (!currentDate) {
    return <main><div className="card"><p className="note" role="status">Loading booking calendar…</p></div></main>;
  }

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const today = toYmd(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  return (
    <main>
      <div className="card">
        {step === "calendar" && (
          <>
            <h1>Book Your Experience</h1>
            <p className="note">Choose a preferred date and time. Your request is personally reviewed before payment.</p>
            {availabilityError ? <p className="error" role="alert">{availabilityError}</p> : null}
            <div className="calendar-header">
              <button type="button" aria-label="Previous month" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>‹</button>
              <h2>{currentDate.toLocaleString("en-GB", { month: "long", year: "numeric" })}</h2>
              <button type="button" aria-label="Next month" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>›</button>
            </div>
            <div className="days" aria-hidden="true">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div className="day-name" key={day}>{day}</div>)}
            </div>
            <div className="dates" aria-label="Available dates">
              {Array.from({ length: firstDay }).map((_, index) => <span className="empty" key={`empty-${index}`} />)}
              {Array.from({ length: lastDate }).map((_, index) => {
                const day = index + 1;
                const fullDate = toYmd(year, month, day);
                const blocked = blockedDates.includes(fullDate);
                const past = fullDate < today;
                const disabled = blocked || past || Boolean(availabilityError);
                return (
                  <button
                    key={fullDate}
                    type="button"
                    className={`date ${selectedDate === fullDate ? "selected" : ""} ${blocked ? "blocked" : ""} ${past ? "past" : ""}`}
                    disabled={disabled}
                    aria-label={`${fullDate}${blocked ? ", unavailable" : ""}`}
                    aria-pressed={selectedDate === fullDate}
                    onClick={() => { setSelectedDate(fullDate); setSelectedTime(""); }}
                  >{day}</button>
                );
              })}
            </div>
            {selectedDate ? (
              <>
                <h2>Choose Time</h2>
                <div className="time-grid">
                  {BOOKING_TIME_SLOTS.map((time) => (
                    <button key={time} type="button" className="time" onClick={() => { setSelectedTime(time); setStep("details"); }}>{time}</button>
                  ))}
                </div>
              </>
            ) : null}
          </>
        )}
        {step === "details" && (
          <>
            <h1>Your Details</h1>
            <div className="summary"><strong>Requested slot</strong><br />{selectedDate} at {selectedTime}</div>
            {formError ? <p className="error" role="alert">{formError}</p> : null}
            <form onSubmit={submitBooking}>
              <label htmlFor="name">Full name</label><input id="name" name="name" required autoComplete="name" maxLength={200} />
              <label htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" maxLength={254} />
              <label htmlFor="phone">Phone</label><input id="phone" name="phone" type="tel" required autoComplete="tel" minLength={7} maxLength={50} />
              <label htmlFor="address">Service address / postcode</label><input id="address" name="address" required autoComplete="street-address" minLength={5} maxLength={500} />
              <label htmlFor="message">Message / notes</label><textarea id="message" name="message" rows={4} maxLength={8000} />
              <p className="form-consent">By sending this request, you agree to our <a href="/privacy">privacy notice</a> and <a href="/terms">booking terms</a>.</p>
              <div className="row"><button type="button" className="secondary" onClick={() => setStep("calendar")}>Back</button><button type="submit" disabled={loading}>{loading ? "Sending…" : "Send request"}</button></div>
            </form>
          </>
        )}
        {step === "done" && (
          <div className="success"><h1>Request received</h1><p>Your appointment is not confirmed yet. We will check availability and send a secure payment link if approved.</p><p className="note"><a href="/">Return to calendar</a></p></div>
        )}
      </div>
    </main>
  );
}
