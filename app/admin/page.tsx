"use client";

import { useEffect, useState } from "react";

function toFullDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isPast(fullDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(fullDate + "T00:00:00") < today;
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [blockedDates, setBlockedDates] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/availability")
      .then((res) => res.json())
      .then((data) => setBlockedDates(data.blockedDates || []));
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();

  function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      setLoggedIn(true);
    } else {
      alert("Wrong password.");
    }
  }

  async function toggleDate(date: string) {
    const response = await fetch("/api/availability", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": password,
      },
      body: JSON.stringify({ date }),
    });

    if (!response.ok) {
      alert("Could not update date.");
      return;
    }

    const data = await response.json();

    if (data.blocked) {
      setBlockedDates((dates) => [...dates, date]);
    } else {
      setBlockedDates((dates) => dates.filter((d) => d !== date));
    }
  }

  if (!loggedIn) {
    return (
      <main>
        <div className="card">
          <h1>Admin Login</h1>
          <p className="note">Enter your admin password to manage unavailable dates.</p>
          <form onSubmit={login}>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button type="submit" style={{ width: "100%", marginTop: 16 }}>
              Login
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="card">
        <h1>Admin Calendar</h1>
        <p className="note">Click dates to block or unblock them. Customers cannot select blocked dates.</p>

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
                className={`date ${blocked ? "blocked" : ""} ${past ? "past" : ""}`}
                onClick={() => {
                  if (past) return;
                  toggleDate(fullDate);
                }}
              >
                {day}
              </div>
            );
          })}
        </div>

        <div className="admin-list">
          <strong>Blocked dates:</strong><br />
          {blockedDates.length ? blockedDates.join(", ") : "No dates blocked yet."}
        </div>
      </div>
    </main>
  );
}
