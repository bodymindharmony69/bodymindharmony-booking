"use client";

import { useEffect, useState } from "react";

const times = ["18:00", "18:30", "19:00", "19:30", "20:00", "20:30"];

function toFullDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isPast(fullDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(fullDate + "T00:00:00") < today;
}

export default function BookingPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [step, setStep] = useState<"calendar" | "details" | "done">("calendar");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/get-blocked")
      .then((res) => (res.ok ? res.json() : Promise.resolve({})))
      .then((data) => setBlockedDates(Array.isArray(data.blockedDates) ? data.blockedDates : []))
      .catch(() => setBlockedDates([]));
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();

  async function submitBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const form = new FormData(event.currentTarget);

    const response = await fetch("/api/booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        selectedDate,
        selectedTime,
        name: form.get("name"),
        email: form.get("email"),
        phone: form.get("phone"),
        address: form.get("address"),
        message: form.get("message"),
      }),
    });

    setLoading(false);

    if (!response.ok) {
      alert("Something went wrong. Please try again.");
      return;
    }

    setStep("done");
  }

  return (
    <main>
      <div className="card">
        {step === "calendar" && (
          <>
            <h1>Book Your Experience</h1>
            <p className="note">
              Choose your preferred date and time. Your request will be checked personally before confirmation.{" "}
              <a href="/admin" style={{ color: "#888" }}>
                Admin
              </a>
            </p>

            <div className="calendar-header">
              <button
                type="button"
                onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
              >
                ‹
              </button>
              <h2>
                {currentDate.toLocaleString("en-GB", {
                  month: "long",
                  year: "numeric",
                })}
              </h2>
              <button
                type="button"
                onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
              >
                ›
              </button>
            </div>

            <div className="days">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div className="day-name" key={day}>{day}</div>
              ))}
            </div>

            <div className="dates">
              {Array.from({ length: firstDay }).map((_, index) => (
                <div className="empty" key={`empty-${index}`} />
              ))}

              {Array.from({ length: lastDate }).map((_, index) => {
                const day = index + 1;
                const fullDate = toFullDate(year, month, day);
                const blocked = blockedDates.includes(fullDate);
                const past = isPast(fullDate);

                return (
                  <div
                    key={fullDate}
                    className={`date ${selectedDate === fullDate ? "selected" : ""} ${blocked ? "blocked" : ""} ${past ? "past" : ""}`}
                    onClick={() => {
                      if (blocked || past) return;
                      setSelectedDate(fullDate);
                      setSelectedTime("");
                    }}
                  >
                    {day}
                  </div>
                );
              })}
            </div>

            {selectedDate && (
              <>
                <h2>Choose Time</h2>
                <div className="time-grid">
                  {times.map((time) => (
                    <div
                      key={time}
                      className="time"
                      onClick={() => {
                        setSelectedTime(time);
                        setStep("details");
                      }}
                    >
                      {time}
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {step === "details" && (
          <>
            <h1>Your Details</h1>

            <div className="summary">
              <strong>Selected request</strong><br />
              Date: {selectedDate}<br />
              Time: {selectedTime}
            </div>

            <form onSubmit={submitBooking}>
              <label>Full name</label>
              <input name="name" required />

              <label>Email</label>
              <input name="email" type="email" required />

              <label>Phone</label>
              <input name="phone" required />

              <label>Address / Postcode</label>
              <input name="address" required />

              <label>Message / notes</label>
              <textarea name="message" rows={4} />

              <div className="row" style={{ marginTop: 16 }}>
                <button type="button" className="secondary" onClick={() => setStep("calendar")}>
                  Back
                </button>
                <button type="submit" disabled={loading}>
                  {loading ? "Sending..." : "Submit"}
                </button>
              </div>
            </form>
          </>
        )}

        {step === "done" && (
          <div className="success">
            <h1>Thank you</h1>
            <p>
              Your request has been sent. I will personally check availability and travel distance.
            </p>
            <p>
              Your booking is not confirmed yet. Once approved, I will send you a secure payment link.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
