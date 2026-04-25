/**
 * Checks .env.local Google vars, fixes GOOGLE_REDIRECT_URI, runs push/ship,
 * prints manual OAuth steps when needed, runs smoke when refresh token present.
 * Does not print secret values.
 */
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env.local");
const REDIRECT =
  "https://www.bodymindharmony.co.uk/api/google/callback";

const isWin = process.platform === "win32";

function parseEnv(filePath) {
  const o = {};
  if (!fs.existsSync(filePath)) return o;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    o[key] = val.replace(/\\n/g, "\n");
  }
  return o;
}

function ensureRedirectInLocal() {
  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(
      envPath,
      `GOOGLE_REDIRECT_URI=${REDIRECT}\n`,
      "utf8",
    );
    console.log("Created .env.local with GOOGLE_REDIRECT_URI only.");
    return;
  }
  const raw = fs.readFileSync(envPath, "utf8");
  const nl = raw.includes("\r\n") ? "\r\n" : "\n";
  const lines = raw.split(/\r?\n/);
  let found = false;
  const out = lines.map((line) => {
    const t = line.trim();
    if (!t || t.startsWith("#")) return line;
    const i = t.indexOf("=");
    if (i <= 0) return line;
    const k = t.slice(0, i).trim();
    if (k !== "GOOGLE_REDIRECT_URI") return line;
    found = true;
    return `GOOGLE_REDIRECT_URI=${REDIRECT}`;
  });
  if (!found) out.push(`GOOGLE_REDIRECT_URI=${REDIRECT}`);
  const body = out.join(nl) + (raw.endsWith("\n") || raw.endsWith("\r\n") ? "" : nl);
  fs.writeFileSync(envPath, body, "utf8");
  console.log("GOOGLE_REDIRECT_URI set in .env.local to the production callback URL.");
}

function runNpm(script) {
  const env = { ...process.env, VERCEL_NONINTERACTIVE: "1" };
  if (isWin) {
    execFileSync("cmd.exe", ["/c", "npm", "run", script], { cwd: root, stdio: "inherit", env });
  } else {
    execFileSync("npm", ["run", script], { cwd: root, stdio: "inherit", env });
  }
}

const local = parseEnv(envPath);
const hasId = Boolean(String(local.GOOGLE_CLIENT_ID ?? "").trim());
const hasSecret = Boolean(String(local.GOOGLE_CLIENT_SECRET ?? "").trim());
const hasRefresh = Boolean(String(local.GOOGLE_REFRESH_TOKEN ?? "").trim());
const redirectOk = String(local.GOOGLE_REDIRECT_URI ?? "").trim() === REDIRECT;

console.log("— Checking .env.local (presence only, not values) —");
console.log("GOOGLE_CLIENT_ID:", hasId ? "set" : "MISSING");
console.log("GOOGLE_CLIENT_SECRET:", hasSecret ? "set" : "MISSING");
console.log(
  "GOOGLE_REDIRECT_URI:",
  redirectOk ? "matches production callback" : "will be set to production callback",
);
console.log("GOOGLE_REFRESH_TOKEN:", hasRefresh ? "set" : "MISSING");

if (!hasId || !hasSecret) {
  console.log("");
  console.log("=== Action required: Google OAuth credentials ===");
  console.log("1. Open Google Cloud Console: https://console.cloud.google.com/");
  console.log("2. Go to APIs & Services → Credentials");
  console.log('3. Create Credentials → OAuth client ID → Application type: Web application');
  console.log("4. Under Authorized redirect URIs, add exactly:");
  console.log("   " + REDIRECT);
  console.log("5. Copy Client ID and Client Secret into .env.local as:");
  console.log("   GOOGLE_CLIENT_ID=...");
  console.log("   GOOGLE_CLIENT_SECRET=...");
  console.log("");
}

ensureRedirectInLocal();

console.log("");
console.log("— npm run env:push —");
runNpm("env:push");

console.log("");
console.log("— npm run ship —");
runNpm("ship");

if (!hasRefresh) {
  console.log("");
  console.log("=== Next manual step: refresh token ===");
  console.log("Open https://www.bodymindharmony.co.uk/admin/bookings");
  console.log("Click Google sign-in (OAuth).");
  console.log("On the callback page, copy the refresh token.");
  console.log("Paste into .env.local as:");
  console.log("GOOGLE_REFRESH_TOKEN=<paste from callback page>");
  console.log("");
  console.log(
    "Google Calendar accept flow: NOT READY (GOOGLE_REFRESH_TOKEN missing in .env.local).",
  );
  process.exit(0);
}

console.log("");
console.log("— GOOGLE_REFRESH_TOKEN present: npm run env:push —");
runNpm("env:push");

console.log("");
console.log("— npm run ship —");
runNpm("ship");

console.log("");
console.log("— npm run test:smoke —");
try {
  runNpm("test:smoke");
  console.log("");
  if (hasId && hasSecret && hasRefresh) {
    console.log(
      "Google Calendar accept flow: READY (all four variables set in .env.local and smoke tests passed).",
    );
  }
} catch {
  console.log("");
  console.log(
    "Google Calendar accept flow: UNCLEAR — smoke tests failed; fix errors above and re-run this script.",
  );
  process.exit(1);
}
