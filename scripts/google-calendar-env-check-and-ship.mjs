/**
 * BodyMindHarmony Google env: check .env.local, .gitignore, push/ship, manual steps.
 * Does not print secret values.
 */
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env.local");
const gitignorePath = path.join(root, ".gitignore");
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

function ensureEnvLocalInGitignore() {
  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, ".env.local\n", "utf8");
    return;
  }
  const raw = fs.readFileSync(gitignorePath, "utf8");
  const lines = raw.split(/\r?\n/);
  if (lines.some((l) => l.trim() === ".env.local")) return;
  const nl = raw.endsWith("\n") ? "" : "\n";
  fs.appendFileSync(gitignorePath, `${nl}.env.local\n`, "utf8");
}

function ensureRedirectInLocal() {
  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(
      envPath,
      `GOOGLE_REDIRECT_URI=${REDIRECT}\n`,
      "utf8",
    );
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
}

function runNpm(script) {
  const env = { ...process.env, VERCEL_NONINTERACTIVE: "1" };
  if (isWin) {
    execFileSync("cmd.exe", ["/c", "npm", "run", script], { cwd: root, stdio: "inherit", env });
  } else {
    execFileSync("npm", ["run", script], { cwd: root, stdio: "inherit", env });
  }
}

function printFinalSummary({ clientPushed, refreshNeedsManual }) {
  console.log("");
  console.log("—— Final ——");
  if (clientPushed) {
    console.log("- Google client env pushed");
  } else {
    console.log("- Google client env not pushed (missing Client ID and/or Client Secret in .env.local)");
  }
  console.log("- Redirect URI confirmed:");
  console.log("  " + REDIRECT);
  if (refreshNeedsManual) {
    console.log(
      "- Refresh token still needs the manual Google sign-in step (add GOOGLE_REFRESH_TOKEN to .env.local).",
    );
  } else {
    console.log("- GOOGLE_REFRESH_TOKEN present; smoke tests completed with this run.");
  }
}

ensureEnvLocalInGitignore();

const local = parseEnv(envPath);
const hasId = Boolean(String(local.GOOGLE_CLIENT_ID ?? "").trim());
const hasSecret = Boolean(String(local.GOOGLE_CLIENT_SECRET ?? "").trim());
const hasRefresh = Boolean(String(local.GOOGLE_REFRESH_TOKEN ?? "").trim());
const redirectOk = String(local.GOOGLE_REDIRECT_URI ?? "").trim() === REDIRECT;

console.log("— .env.local (presence only) —");
console.log("GOOGLE_CLIENT_ID:", hasId ? "set" : "MISSING");
console.log("GOOGLE_CLIENT_SECRET:", hasSecret ? "set" : "MISSING");
console.log(
  "GOOGLE_REDIRECT_URI:",
  redirectOk ? "matches production callback" : "will be normalized to production callback",
);
console.log("GOOGLE_REFRESH_TOKEN:", hasRefresh ? "set" : "MISSING");

if (!hasId || !hasSecret) {
  console.log("");
  console.log(
    "Paste your Google Client ID and Google Client Secret into .env.local, then run this again.",
  );
  printFinalSummary({ clientPushed: false, refreshNeedsManual: !hasRefresh });
  process.exit(0);
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
  console.log(
    "Now open https://www.bodymindharmony.co.uk/admin/bookings and click Google sign-in. Copy the refresh token from the callback page. Add it to .env.local as GOOGLE_REFRESH_TOKEN=your_token_here. Then run npm run google:env-check-and-ship again.",
  );
  printFinalSummary({ clientPushed: true, refreshNeedsManual: true });
  process.exit(0);
}

console.log("");
console.log("— npm run env:push —");
runNpm("env:push");

console.log("");
console.log("— npm run ship —");
runNpm("ship");

console.log("");
console.log("— npm run test:smoke —");
try {
  runNpm("test:smoke");
  printFinalSummary({ clientPushed: true, refreshNeedsManual: false });
} catch {
  console.log("");
  console.log("Smoke tests failed; fix the errors above and re-run.");
  printFinalSummary({ clientPushed: true, refreshNeedsManual: false });
  process.exit(1);
}
