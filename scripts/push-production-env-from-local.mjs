/**
 * Pushes app env keys to Vercel Production (overwrites existing).
 * Merges: .env.vercel.production (if present) then .env.local (local wins).
 * Fills NEXT_PUBLIC_* from Supabase-style names when blank.
 * Derives GOOGLE_REDIRECT_URI from NEXT_PUBLIC_SITE_URL / SITE_URL when blank.
 * Does not print secret values. Requires: npx vercel login, linked project.
 */
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const localPath = path.join(root, ".env.local");
const vercelPullPath = path.join(root, ".env.vercel.production");

const KEYS = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  /** Present on Vercel’s Supabase integration; server uses it if JWT role key is unset. */
  "SUPABASE_SECRET_KEY",
  "ADMIN_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REDIRECT_URI",
  "GOOGLE_REFRESH_TOKEN",
];

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

/** Vercel pull first; .env.local overrides only when the value is non-empty (empty lines must not wipe secrets). */
function mergeSources() {
  const pulled = parseEnv(vercelPullPath);
  const local = parseEnv(localPath);
  const out = { ...pulled };
  for (const [k, val] of Object.entries(local)) {
    const s = String(val ?? "").trim();
    if (s !== "") out[k] = val;
  }
  return out;
}

const DEFAULT_PUBLIC_SITE = "https://www.bodymindharmony.co.uk";

function applyAliases(m) {
  if (!String(m.NEXT_PUBLIC_SUPABASE_URL ?? "").trim() && String(m.SUPABASE_URL ?? "").trim()) {
    m.NEXT_PUBLIC_SUPABASE_URL = String(m.SUPABASE_URL).trim();
  }
  if (!String(m.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim()) {
    const alt =
      m.SUPABASE_ANON_KEY ||
      m.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      m.SUPABASE_PUBLISHABLE_KEY;
    if (String(alt ?? "").trim()) m.NEXT_PUBLIC_SUPABASE_ANON_KEY = String(alt).trim();
  }
  if (!String(m.SUPABASE_SERVICE_ROLE_KEY ?? "").trim() && String(m.SUPABASE_SECRET_KEY ?? "").trim()) {
    m.SUPABASE_SERVICE_ROLE_KEY = String(m.SUPABASE_SECRET_KEY).trim();
    console.log("SUPABASE_SERVICE_ROLE_KEY: aliased from SUPABASE_SECRET_KEY for push");
  }
  if (!String(m.NEXT_PUBLIC_SITE_URL ?? "").trim() && !String(m.SITE_URL ?? "").trim()) {
    m.NEXT_PUBLIC_SITE_URL = DEFAULT_PUBLIC_SITE;
    console.log("NEXT_PUBLIC_SITE_URL: using production default (override in .env.local if needed)");
  }
  const site = String(m.NEXT_PUBLIC_SITE_URL ?? m.SITE_URL ?? "").trim();
  if (!String(m.GOOGLE_REDIRECT_URI ?? "").trim() && site) {
    m.GOOGLE_REDIRECT_URI = `${site.replace(/\/+$/, "")}/api/google/callback`;
    console.log("GOOGLE_REDIRECT_URI: derived from site URL (not printing value)");
  }
}

const isWin = process.platform === "win32";

function vercel(args) {
  const env = { ...process.env, VERCEL_NONINTERACTIVE: "1" };
  if (isWin) {
    execFileSync("cmd.exe", ["/c", "npx", "vercel", ...args], {
      cwd: root,
      stdio: "pipe",
      env,
    });
  } else {
    execFileSync("npx", ["vercel", ...args], { cwd: root, stdio: "pipe", env });
  }
}

const merged = mergeSources();
applyAliases(merged);

if (!fs.existsSync(localPath) && !fs.existsSync(vercelPullPath)) {
  console.error("No .env.local or .env.vercel.production found. Run: npx vercel env pull .env.vercel.production --environment production --yes");
  process.exit(1);
}

for (const k of KEYS) {
  const v = merged[k]?.trim();
  if (!v) {
    console.log(`${k}: skip (empty after merge + aliases)`);
    continue;
  }
  try {
    vercel(["env", "rm", k, "production", "--yes"]);
  } catch {
    /* not present */
  }
  try {
    vercel([
      "env",
      "add",
      k,
      "production",
      "--value",
      v,
      "--yes",
      "--sensitive",
    ]);
    console.log(`${k}: synced to Vercel Production`);
  } catch (e) {
    console.error(`${k}: failed`, e instanceof Error ? e.message : e);
    process.exitCode = 1;
  }
}
