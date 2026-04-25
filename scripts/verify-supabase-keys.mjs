/**
 * Verifies anon JWT `ref` matches Supabase project ref in URL. Prints MATCH/MISMATCH only.
 * Usage: node scripts/verify-supabase-keys.mjs
 * Requires .env.local from `vercel env pull`.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env.local");

function loadEnv(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) throw new Error("Missing " + filePath);
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    let key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

function projectRefFromUrl(urlRaw) {
  const u = urlRaw.trim().replace(/\/+$/, "");
  const m = u.match(/https?:\/\/([a-z0-9-]+)\.supabase\.co/i);
  return m ? m[1].toLowerCase() : null;
}

function refFromJwt(jwt) {
  const parts = jwt.split(".");
  if (parts.length < 2) return null;
  const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const json = JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
  return typeof json.ref === "string" ? json.ref.toLowerCase() : null;
}

const env = loadEnv(envPath);
const url =
  env.NEXT_PUBLIC_SUPABASE_URL ||
  env.SUPABASE_URL ||
  "";
const anon =
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  env.SUPABASE_ANON_KEY ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  env.SUPABASE_PUBLISHABLE_KEY ||
  "";

const urlRef = projectRefFromUrl(url.startsWith("http") ? url : "");
const jwtRef = anon ? refFromJwt(anon) : null;

if (!urlRef || !jwtRef) {
  console.log("SKIP: could not parse URL project ref or JWT ref (check URL is https *.supabase.co and key is a JWT)");
  process.exit(0);
}

console.log(urlRef === jwtRef ? "MATCH" : "MISMATCH");
