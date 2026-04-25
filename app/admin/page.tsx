"use client";

import { useCallback, useEffect, useState } from "react";

function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function AdminPage() {
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [pending, setPending] = useState<string | null>(null);

  const refresh = useCallback(() => {
    fetch("/api/get-blocked")
      .then((res) => res.json())
      .then((data) => setBlockedDates(data.blockedDates ?? []));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: dateStr }),
    });
    setPending(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
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
      </div>
    </main>
  );
}
