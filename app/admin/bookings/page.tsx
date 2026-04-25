"use client";

import { useCallback, useEffect, useState } from "react";

const SESSION_OK = "bodymindharmony_admin_ok";
const SESSION_SECRET = "bodymindharmony_admin_secret";

type CalendarStatus = {
  hasClientId: boolean;
  hasClientSecret: boolean;
  hasRedirectUriEnv: boolean;
  hasRedirectUriEffective: boolean;
  hasRefreshToken: boolean;
  redirectUri: string | null;
};

type Booking = {
  id: string;
  client_name: string;
  booking_date: string;
  booking_time: string;
  status: string;
  client_email?: string | null;
  client_phone?: string | null;
  address?: string | null;
  message?: string | null;
};

export default function AdminBookingsPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [adminSecret, setAdminSecret] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoadError, setBookingsLoadError] = useState("");
  const [bookingBusy, setBookingBusy] = useState<string | null>(null);
  const [googleStatus, setGoogleStatus] = useState<CalendarStatus | null>(null);
  const [googleStatusError, setGoogleStatusError] = useState("");
  const [googleAuthBusy, setGoogleAuthBusy] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ok = sessionStorage.getItem(SESSION_OK) === "1";
    const secret = sessionStorage.getItem(SESSION_SECRET) ?? "";
    if (ok && secret) {
      setUnlocked(true);
      setAdminSecret(secret);
    }
  }, []);

  const loadBookings = useCallback(() => {
    if (!adminSecret) return;
    setBookingsLoadError("");
    setListLoading(true);
    fetch("/api/admin/bookings/list", { headers: { "x-admin-secret": adminSecret } })
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 401) {
            sessionStorage.removeItem(SESSION_OK);
            sessionStorage.removeItem(SESSION_SECRET);
            setUnlocked(false);
            setAdminSecret("");
          }
          const j = await res.json().catch(() => ({}));
          setBookingsLoadError(
            typeof j.error === "string" ? j.error : `Could not load bookings (${res.status}).`,
          );
          setBookings([]);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data && Array.isArray(data.bookings)) setBookings(data.bookings);
      })
      .catch(() => {
        setBookingsLoadError("Could not load bookings.");
        setBookings([]);
      })
      .finally(() => setListLoading(false));
  }, [adminSecret]);

  const loadGoogleStatus = useCallback(() => {
    if (!adminSecret) return;
    setGoogleStatusError("");
    fetch("/api/admin/google/calendar-status", { headers: { "x-admin-secret": adminSecret } })
      .then(async (res) => {
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          setGoogleStatus(null);
          setGoogleStatusError(
            typeof j.error === "string" ? j.error : `Calendar status failed (${res.status}).`,
          );
          return;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setGoogleStatus(data as CalendarStatus);
      })
      .catch(() => {
        setGoogleStatus(null);
        setGoogleStatusError("Could not load Google Calendar status.");
      });
  }, [adminSecret]);

  useEffect(() => {
    if (unlocked && adminSecret) {
      loadBookings();
      loadGoogleStatus();
    }
  }, [unlocked, adminSecret, loadBookings, loadGoogleStatus]);

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

  async function acceptBooking(id: string) {
    setActionError("");
    setBookingBusy(id);
    const res = await fetch("/api/admin/bookings/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-secret": adminSecret },
      body: JSON.stringify({ id }),
    });
    setBookingBusy(null);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setActionError(typeof data.error === "string" ? data.error : "Accept failed");
      return;
    }
    loadBookings();
    loadGoogleStatus();
  }

  async function declineBooking(id: string) {
    setActionError("");
    setBookingBusy(id);
    const res = await fetch("/api/admin/bookings/decline", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-secret": adminSecret },
      body: JSON.stringify({ id }),
    });
    setBookingBusy(null);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setActionError(typeof data.error === "string" ? data.error : "Decline failed");
      return;
    }
    loadBookings();
  }

  if (!unlocked) {
    return (
      <main className="admin-main">
        <div className="admin-card">
          <h1>Bookings</h1>
          <p className="note">Enter the admin password to view requests and accept or decline.</p>
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
        <h1>Bookings</h1>
        <p className="note">
          Accept creates a Google Calendar event, marks the request accepted, and blocks the date. Decline only
          updates status.
        </p>

        <h2 className="admin-sub">Google Calendar</h2>
        <div className="admin-google-panel">
          {googleStatusError ? <p className="admin-login-error">{googleStatusError}</p> : null}
          {googleStatus ? (
            <>
              {googleStatus.hasClientId &&
              googleStatus.hasClientSecret &&
              googleStatus.hasRedirectUriEffective &&
              googleStatus.hasRefreshToken ? (
                <p className="admin-google-ok">
                  Connected. Accept uses the <strong>primary</strong> calendar (Europe/London), 2-hour events.
                </p>
              ) : (
                <>
                  <p className="note">
                    Use this exact redirect URI in Google Cloud Console (Authorized redirect URIs). It may come from{" "}
                    <code className="admin-google-code">GOOGLE_REDIRECT_URI</code> or be derived from your public site
                    URL.
                  </p>
                  <code className="admin-google-code">
                    {googleStatus.redirectUri ?? "(not resolved — set NEXT_PUBLIC_SITE_URL or GOOGLE_REDIRECT_URI)"}
                  </code>
                  <ul className="admin-google-steps">
                    <li className={googleStatus.hasClientId ? "admin-google-step--ok" : ""}>
                      Set <code className="admin-google-code">GOOGLE_CLIENT_ID</code> in Vercel (OAuth client).
                    </li>
                    <li
                      className={
                        googleStatus.hasClientId && googleStatus.hasClientSecret ? "admin-google-step--ok" : ""
                      }
                    >
                      Set <code className="admin-google-code">GOOGLE_CLIENT_SECRET</code>.
                    </li>
                    <li
                      className={
                        googleStatus.hasRedirectUriEffective ? "admin-google-step--ok" : ""
                      }
                    >
                      Set <code className="admin-google-code">GOOGLE_REDIRECT_URI</code> (or{" "}
                      <code className="admin-google-code">NEXT_PUBLIC_SITE_URL</code> so redirect is derived) to match
                      the box above exactly.
                    </li>
                    <li className={googleStatus.hasRefreshToken ? "admin-google-step--ok" : ""}>
                      Open Google sign-in, then add <code className="admin-google-code">GOOGLE_REFRESH_TOKEN</code> from
                      the callback page.
                    </li>
                  </ul>
                  <button
                    type="button"
                    className="admin-google-oauth-btn"
                    disabled={
                      googleAuthBusy ||
                      !googleStatus.hasClientId ||
                      !googleStatus.hasClientSecret ||
                      !googleStatus.hasRedirectUriEffective
                    }
                    onClick={async () => {
                      setGoogleAuthBusy(true);
                      try {
                        const res = await fetch("/api/google/auth-url");
                        const j = await res.json().catch(() => ({}));
                        if (!res.ok || typeof j.url !== "string") {
                          alert(
                            typeof j.error === "string"
                              ? j.error
                              : "Could not get Google sign-in URL. Check Vercel env and redeploy.",
                          );
                          return;
                        }
                        window.open(j.url, "_blank", "noopener,noreferrer");
                      } finally {
                        setGoogleAuthBusy(false);
                      }
                    }}
                  >
                    {googleAuthBusy ? "Opening…" : "Open Google sign-in"}
                  </button>
                  <button type="button" className="secondary admin-google-refresh" onClick={() => loadGoogleStatus()}>
                    Refresh status
                  </button>
                </>
              )}
            </>
          ) : !googleStatusError ? (
            <p className="note">Loading…</p>
          ) : null}
        </div>

        <h2 className="admin-sub">All requests</h2>
        {bookingsLoadError ? <p className="admin-login-error">{bookingsLoadError}</p> : null}
        {actionError ? <p className="admin-login-error">{actionError}</p> : null}
        {listLoading ? <p className="note">Loading bookings…</p> : null}
        <div className="admin-bookings">
          {!listLoading && !bookingsLoadError && bookings.length === 0 ? (
            <p className="note">No bookings yet.</p>
          ) : bookingsLoadError || listLoading ? null : (
            <ul className="admin-booking-list">
              {bookings.map((b) => (
                <li key={b.id} className="admin-booking-row">
                  <div>
                    <strong>{b.client_name}</strong> · {b.booking_date} {b.booking_time}{" "}
                    <span style={{ color: "#888" }}>({b.status})</span>
                    <div className="admin-booking-meta">
                      {[b.client_email, b.client_phone].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  {b.status === "pending" ? (
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
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="note" style={{ marginTop: 24 }}>
          <a href="/admin" style={{ color: "#aaa" }}>
            ← Block dates
          </a>
          {" · "}
          <a href="/" style={{ color: "#aaa" }}>
            Booking page
          </a>
          {" · "}
          <a href="/book" style={{ color: "#aaa" }}>
            Simple form
          </a>
        </p>
      </div>
    </main>
  );
}
