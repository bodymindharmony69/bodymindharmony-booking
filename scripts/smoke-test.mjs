/**
 * End-to-end smoke tests against a deployed site (default: production).
 *
 * Usage:
 *   npm run test:smoke
 *   SMOKE_BASE_URL=http://localhost:3000 npm run test:smoke
 *   ADMIN_SECRET=... npm run test:smoke
 *
 * Loads `.env.local` for empty env keys (so `npm test` sees ADMIN_SECRET like `next build`).
 * If ADMIN_SECRET is still unset, reads ./ADMIN_SECRET.once.txt when present.
 * Admin-only tests are skipped when no secret is available (exit 0).
 *
 * Options: --strict-admin  → exit 1 when admin secret missing
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const args = process.argv.slice(2);
const strictAdmin = args.includes("--strict-admin");

/** Merge .env.local into process.env when a key is unset or empty (matches Next.js dev UX for smoke). */
function loadEnvLocal() {
  const envPath = path.join(root, ".env.local");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    const cur = process.env[key];
    if (cur === undefined || String(cur).trim() === "") {
      process.env[key] = val;
    }
  }
}

loadEnvLocal();

const BASE = (process.env.SMOKE_BASE_URL || "https://www.bodymindharmony.co.uk").replace(/\/+$/, "");

function loadAdminSecret() {
  const fromEnv = process.env.ADMIN_SECRET?.trim();
  if (fromEnv) return fromEnv;
  const filePath = path.join(root, "ADMIN_SECRET.once.txt");
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, "utf8").trim();
  }
  return "";
}

let pass = 0;
let fail = 0;
let skip = 0;

function ok(name) {
  console.log("PASS", name);
  pass++;
}

function bad(name, detail) {
  console.log("FAIL", name, detail ?? "");
  fail++;
}

function skipped(name, reason) {
  console.log("SKIP", name, "-", reason);
  skip++;
}

async function fetchJson(method, pathname, { headers, body } = {}) {
  const res = await fetch(`${BASE}${pathname}`, {
    method,
    headers: { ...headers },
    body: body != null ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { res, text, json };
}

async function main() {
  console.log("Smoke base URL:", BASE);

  {
    const { res, json } = await fetchJson("GET", "/api/get-blocked");
    if (res.status !== 200 || !json || !Array.isArray(json.blockedDates)) {
      bad("GET /api/get-blocked", `${res.status} ${JSON.stringify(json)}`);
    } else ok("GET /api/get-blocked");
  }

  {
    const { res } = await fetchJson("POST", "/api/booking-request", {
      headers: { "Content-Type": "application/json" },
      body: { client_name: "", booking_date: "2026-06-15", booking_time: "18:00", address: "x" },
    });
    if (res.status !== 400) bad("POST booking empty name", String(res.status));
    else ok("POST booking empty name → 400");
  }

  {
    const { res } = await fetchJson("POST", "/api/booking-request", {
      headers: { "Content-Type": "application/json" },
      body: {
        client_name: "x",
        booking_date: "2020-02-30",
        booking_time: "18:00",
        address: "x",
      },
    });
    if (res.status !== 400) bad("POST booking invalid date", String(res.status));
    else ok("POST booking invalid date → 400");
  }

  {
    const { res } = await fetchJson("POST", "/api/booking-request", {
      headers: { "Content-Type": "application/json" },
      body: {
        client_name: "x",
        booking_date: "2026-06-16",
        booking_time: "18:15",
        address: "x",
      },
    });
    if (res.status !== 400) bad("POST booking invalid time slot", String(res.status));
    else ok("POST booking invalid time → 400");
  }

  const smokeTag = `SMOKE_${Date.now()}`;
  let smokeId = "";
  {
    const { res, json, text } = await fetchJson("POST", "/api/booking-request", {
      headers: { "Content-Type": "application/json" },
      body: {
        client_name: smokeTag,
        client_email: "smoke@example.com",
        client_phone: "07000001111",
        booking_date: "2026-06-17",
        booking_time: "19:00",
        address: "Smoke addr",
        message: "smoke test booking",
      },
    });
    if (res.status !== 200 || !json?.success) {
      bad("POST booking valid", `${res.status} ${text}`);
    } else ok("POST booking valid");
  }

  {
    const { res } = await fetchJson("POST", "/api/admin-auth", {
      headers: { "Content-Type": "application/json" },
      body: { password: "definitely-not-the-admin-secret-xyz" },
    });
    if (res.status !== 401) bad("POST admin-auth wrong password", String(res.status));
    else ok("POST admin-auth wrong → 401");
  }

  const adminSecret = loadAdminSecret();
  if (!adminSecret) {
    if (strictAdmin) {
      bad("admin secret", "missing (set ADMIN_SECRET or ADMIN_SECRET.once.txt)");
    } else {
      skipped("admin suite", "no ADMIN_SECRET / ADMIN_SECRET.once.txt");
    }
  } else {
    {
      const { res, json } = await fetchJson("POST", "/api/admin-auth", {
        headers: { "Content-Type": "application/json" },
        body: { password: adminSecret },
      });
      if (res.status !== 200 || !json?.ok) bad("POST admin-auth ok", res.status);
      else ok("POST admin-auth ok");
    }

    {
      const { res, json } = await fetchJson("GET", "/api/admin/bookings/list", {
        headers: { "x-admin-secret": adminSecret },
      });
      if (res.status !== 200 || !Array.isArray(json?.bookings)) {
        bad("GET admin bookings list", res.status);
      } else {
        ok("GET admin bookings list");
        const row = json.bookings.find((b) => b.client_name === smokeTag);
        if (row?.id) smokeId = row.id;
      }
    }

    const toggleDate = "2026-07-01";
    {
      const { res, json } = await fetchJson("POST", "/api/block-date", {
        headers: { "Content-Type": "application/json", "x-admin-secret": adminSecret },
        body: { date: toggleDate },
      });
      if (res.status !== 200 || typeof json?.blocked !== "boolean") {
        bad("POST block-date (toggle 1)", `${res.status} ${JSON.stringify(json)}`);
      } else ok(`POST block-date first toggle → blocked=${json.blocked}`);
    }
    {
      const { res, json } = await fetchJson("POST", "/api/block-date", {
        headers: { "Content-Type": "application/json", "x-admin-secret": adminSecret },
        body: { date: toggleDate },
      });
      if (res.status !== 200 || typeof json?.blocked !== "boolean") {
        bad("POST block-date (toggle 2)", `${res.status} ${JSON.stringify(json)}`);
      } else ok(`POST block-date second toggle → blocked=${json.blocked}`);
    }

    {
      const { res, json } = await fetchJson("GET", "/api/get-blocked");
      if (res.status !== 200 || !Array.isArray(json?.blockedDates)) bad("GET blocked after toggle", res.status);
      else ok("GET /api/get-blocked after admin toggles");
    }

    {
      const { res } = await fetchJson("POST", "/api/block-date", {
        headers: { "Content-Type": "application/json", "x-admin-secret": adminSecret },
        body: { date: "not-a-date" },
      });
      if (res.status !== 400) bad("POST block-date bad date", String(res.status));
      else ok("POST block-date invalid → 400");
    }

    if (smokeId) {
      {
        const { res, json } = await fetchJson("POST", "/api/admin/bookings/decline", {
          headers: { "Content-Type": "application/json", "x-admin-secret": adminSecret },
          body: { id: smokeId },
        });
        if (res.status !== 200 || !json?.success) bad("POST decline smoke booking", `${res.status}`);
        else ok("POST admin decline smoke booking");
      }
      {
        const { res, json } = await fetchJson("POST", "/api/admin/bookings/decline", {
          headers: { "Content-Type": "application/json", "x-admin-secret": adminSecret },
          body: { id: smokeId },
        });
        if (res.status !== 409) bad("POST decline same id again → 409", String(res.status));
        else ok("POST decline already-declined → 409");
      }
    } else {
      skipped("decline smoke booking", "id not found in list");
    }

    const acceptTag = `SMOKE_ACCEPT_${Date.now()}`;
    /** Avoid fixed dates that may already be in blocked_dates from earlier runs. */
    const acceptDate = (() => {
      const d = new Date();
      d.setUTCHours(12, 0, 0, 0);
      d.setUTCDate(d.getUTCDate() + 200 + (Math.floor(Date.now() / 1000) % 45));
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, "0");
      const day = String(d.getUTCDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    })();
    {
      const { res, json } = await fetchJson("POST", "/api/booking-request", {
        headers: { "Content-Type": "application/json" },
        body: {
          client_name: acceptTag,
          client_email: "smoke-accept@example.com",
          client_phone: "07000002222",
          booking_date: acceptDate,
          booking_time: "20:00",
          address: "Accept smoke",
          message: "for accept test",
        },
      });
      if (res.status !== 200 || !json?.success) bad("POST booking for accept flow", res.status);
      else ok("POST booking for accept flow");
    }
    let acceptId = "";
    {
      const { res, json } = await fetchJson("GET", "/api/admin/bookings/list", {
        headers: { "x-admin-secret": adminSecret },
      });
      const row = json?.bookings?.find((b) => b.client_name === acceptTag);
      if (row?.id) acceptId = row.id;
    }
    if (acceptId) {
      {
        const { res, json } = await fetchJson("POST", "/api/admin/bookings/accept", {
          headers: { "Content-Type": "application/json", "x-admin-secret": adminSecret },
          body: { id: acceptId, final_price: 1 },
        });
        const errText = typeof json?.error === "string" ? json.error : "";
        if (
          res.status === 500 &&
          (errText.includes("Missing Google Calendar") || errText.includes("GOOGLE_"))
        ) {
          skipped("admin accept + blocked date checks", "Google Calendar env not set on server (required for accept)");
        } else if (
          res.status === 500 &&
          (errText.includes("STRIPE_SECRET_KEY") ||
            errText.includes("Missing env: STRIPE") ||
            errText.includes("Stripe"))
        ) {
          skipped("admin accept + blocked date checks", "Stripe not configured on server (required for accept)");
        } else if (res.status !== 200 || !json?.success) {
          bad("POST admin accept", `${res.status} ${JSON.stringify(json)}`);
        } else {
          ok("POST admin accept smoke booking");
          {
            const { res: r2, json: j2 } = await fetchJson("GET", "/api/get-blocked");
            const dates = j2?.blockedDates ?? [];
            if (!dates.includes(acceptDate)) bad("GET blocked includes accepted date", JSON.stringify(dates));
            else ok("GET blocked includes date after accept");
          }
          {
            const { res: r3, json: j3 } = await fetchJson("POST", "/api/admin/bookings/accept", {
              headers: { "Content-Type": "application/json", "x-admin-secret": adminSecret },
              body: { id: acceptId },
            });
            if (r3.status !== 409) bad("POST accept twice → 409", String(r3.status));
            else ok("POST accept already-accepted → 409");
          }
        }
      }
    } else {
      skipped("accept flow", "booking id not found in list");
    }
  }

  {
    const res = await fetch(`${BASE}/`);
    if (res.status !== 200) bad("GET /", String(res.status));
    else ok("GET / (HTML)");
  }

  {
    const { res, json } = await fetchJson("GET", "/api/google/auth-url");
    if (res.status === 200 && json?.url) ok("GET /api/google/auth-url (configured)");
    else if (res.status === 500 && json?.error) ok("GET /api/google/auth-url (not configured → 500)");
    else bad("GET /api/google/auth-url", `${res.status} ${JSON.stringify(json)}`);
  }

  console.log("—");
  console.log(`Results: ${pass} passed, ${fail} failed, ${skip} skipped`);
  if (fail > 0) process.exit(1);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
