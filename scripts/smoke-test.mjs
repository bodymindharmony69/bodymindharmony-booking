/**
 * Safe smoke test. It never creates bookings or changes admin data.
 * Start the app locally, then run: npm run test:smoke
 * Production requires: ALLOW_PRODUCTION_SMOKE=1 npm run test:production
 */
const argUrl = process.argv.find((arg) => /^https?:\/\//.test(arg));
const base = (process.env.SMOKE_BASE_URL || argUrl || "http://localhost:3000").replace(/\/+$/, "");
const production = !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(base);
if (production && process.env.ALLOW_PRODUCTION_SMOKE !== "1") {
  throw new Error("Production smoke test requires ALLOW_PRODUCTION_SMOKE=1.");
}

let failed = 0;
async function check(name, action) {
  try {
    await action();
    console.log("PASS", name);
  } catch (error) {
    failed++;
    console.error("FAIL", name, error instanceof Error ? error.message : error);
  }
}

function assert(value, message) {
  if (!value) throw new Error(message);
}

await check("homepage", async () => {
  const response = await fetch(`${base}/`);
  const html = await response.text();
  assert(
    response.ok &&
      html.includes("<title>BodyMindHarmony Massage Booking</title>") &&
      html.includes("Loading booking calendar"),
    `status ${response.status}`,
  );
});

await check("availability API", async () => {
  const response = await fetch(`${base}/api/get-blocked`);
  const body = await response.json();
  assert(response.ok && Array.isArray(body.blockedDates), `status ${response.status}`);
});

await check("invalid booking rejected without a write", async () => {
  const response = await fetch(`${base}/api/booking-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  assert(response.status === 400, `status ${response.status}`);
});

await check("private admin API", async () => {
  const response = await fetch(`${base}/api/admin/bookings/list`);
  assert(response.status === 401, `status ${response.status}`);
});

for (const path of ["/privacy", "/terms", "/robots.txt", "/sitemap.xml"]) {
  await check(path, async () => {
    const response = await fetch(`${base}${path}`);
    assert(response.ok, `status ${response.status}`);
  });
}

if (failed) process.exit(1);
