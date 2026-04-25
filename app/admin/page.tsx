"use client";

import { useCallback, useEffect, useState } from "react";

const SESSION_OK = "bodymindharmony_admin_ok";
const SESSION_SECRET = "bodymindharmony_admin_secret";

function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [adminSecret, setAdminSecret] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [bookings, setBookings] = useState<
    {
      id: string;
      client_name: string;
      booking_date: string;
      booking_time: string;
      status: string;
      client_email?: string | null;
      client_phone?: string | null;
    }[]
  >([]);
  const [bookingBusy, setBookingBusy] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ok = sessionStorage.getItem(SESSION_OK) === "1";
    const secret = sessionStorage.getItem(SESSION_SECRET) ?? "";
    if (ok && secret) {
      setUnlocked(true);
      setAdminSecret(secret);
    }
  }, []);

  const refresh = useCallback(() => {
    fetch("/api/get-blocked")
      .then((res) => (res.ok ? res.json() : Promise.resolve({})))
      .then((data) => setBlockedDates(Array.isArray(data.blockedDates) ? data.blockedDates : []))
      .catch(() => setBlockedDates([]));
  }, []);

  const loadBookings = useCallback(() => {
    if (!adminSecret) return;
    fetch("/api/admin/bookings/list", { headers: { "x-admin-secret": adminSecret } })
      .then((res) => (res.ok ? res.json() : Promise.resolve({})))
      .then((data) => (Array.isArray(data.bookings) ? setBookings(data.bookings) : setBookings([])))
      .catch(() => setBookings([]));
  }, [adminSecret]);

  useEffect(() => {
    if (unlocked) refresh();
  }, [unlocked, refresh]);

  useEffect(() => {
    if (unlocked && adminSecret) loadBookings();
  }, [unlocked, adminSecret, loadBookings]);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoginError("");
    const res = await fetch("/api/admin-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: passwordInput }),
    });
    if (!res.ok) {
      setLoginError("Wrong password or server error.");
      return;
    }
    sessionStorage.setItem(SESSION_OK, "1");
    sessionStorage.setItem(SESSION_SECRET, passwordInput);
    setAdminSecret(passwordInput);
    setPasswordInput("");
    setUnlocked(true);
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });

  async function toggle(dateStr: string) {
    setPending(dateStr);
    const res = await fetch("/api/block-date", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": adminSecret,
      },
      body: JSON.stringify({ date: dateStr }),
    });
    setPending(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        sessionStorage.removeItem(SESSION_OK);
        sessionStorage.removeItem(SESSION_SECRET);
        setUnlocked(false);
        setAdminSecret("");
        alert("Session expired or unauthorized.");
        return;
      }
      alert(data.error ?? "Could not update date.");
      return;
    }
    const data = await res.json();
    if (data.blocked) {
      setBlockedDates((prev) => [...new Set([...prev, dateStr])].sort());
    } else {
      setBlockedDates((prev) => prev.filter((d) => d !== dateStr));
    }
  }

  async function acceptBooking(id: string) {
    setBookingBusy(id);
    const res = await fetch("/api/admin/bookings/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-secret": adminSecret },
      body: JSON.stringify({ id }),
    });
    setBookingBusy(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Accept failed");
      return;
    }
    loadBookings();
    refresh();
  }

  async function declineBooking(id: string) {
    setBookingBusy(id);
    const res = await fetch("/api/admin/bookings/decline", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-secret": adminSecret },
      body: JSON.stringify({ id }),
    });
    setBookingBusy(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Decline failed");
      return;
    }
    loadBookings();
  }

  if (!unlocked) {
    return (
      <main className="admin-main">
        <div className="admin-card">
          <h1>Admin</h1>
          <p className="note">Enter the admin password to manage blocked dates.</p>
          <form onSubmit={handleLogin}>
            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              required
            />
            {loginError ? <p className="admin-login-error">{loginError}</p> : null}
            <button type="submit" className="admin-login-btn">
              Continue
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-main">
      <div className="admin-card">
        <h1>Block dates</h1>
        <p className="note">Next 30 days · green = available · red = blocked · click to toggle</p>
        <div className="admin-grid">
          {days.map((d) => {
            const dateStr = toYMD(d);
            const blocked = blockedDates.includes(dateStr);
            const busy = pending === dateStr;
            return (
              <button
                key={dateStr}
                type="button"
                className={`admin-day ${blocked ? "admin-day--blocked" : "admin-day--open"}`}
                disabled={busy}
                onClick={() => toggle(dateStr)}
              >
                <span className="admin-day-num">{d.getDate()}</span>
                <span className="admin-day-meta">
                  {d.toLocaleDateString("en-GB", { weekday: "short", month: "short" })}
                </span>
              </button>
            );
          })}
        </div>

        <h2 className="admin-sub">Pending bookings</h2>
        <p className="note">Accept adds a Google Calendar event (if configured) and blocks that date.</p>
        <div className="admin-bookings">
          {bookings.filter((b) => b.status === "pending").length === 0 ? (
            <p className="note">No pending requests.</p>
          ) : (
            <ul className="admin-booking-list">
              {bookings
                .filter((b) => b.status === "pending")
                .map((b) => (
                  <li key={b.id} className="admin-booking-row">
                    <div>
                      <strong>{b.client_name}</strong> · {b.booking_date} {b.booking_time}
                      <div className="admin-booking-meta">
                        {[b.client_email, b.client_phone].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <div className="admin-booking-actions">
                      <button
                        type="button"
                        disabled={bookingBusy === b.id}
                        onClick={() => acceptBooking(b.id)}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        disabled={bookingBusy === b.id}
                        onClick={() => declineBooking(b.id)}
                      >
                        Decline
                      </button>
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </div>

        <p className="note" style={{ marginTop: 24 }}>
          <a href="/" style={{ color: "#aaa" }}>
            ← Back to booking
          </a>
        </p>
      </div>
    </main>
  );
}
