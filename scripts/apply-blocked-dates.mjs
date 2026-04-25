/**
 * Apply supabase-blocked-dates.sql using Postgres URL from .env.local.
 *
 * 1) npx vercel env pull .env.local --environment production --yes
 * 2) npm install pg@8 --no-save
 * 3) node scripts/apply-blocked-dates.mjs
 *    (If TLS fails on Windows only, try NODE_EXTRA_CA_CERTS or ask IT; avoid NODE_TLS_REJECT_UNAUTHORIZED=0.)
 *    Optional: node scripts/apply-blocked-dates.mjs supabase-booking-requests.sql
 *    Optional third arg: env file name (default .env.local), e.g. .env.vercel.production
 *
 * Does not print secrets. .env.local must stay gitignored.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadEnv(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) throw new Error("Missing env file: " + filePath);
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
    env[key] = val.replace(/\\n/g, "\n");
  }
  return env;
}

const envFileName = process.argv[3] || ".env.local";
const env = loadEnv(path.join(root, envFileName));
const connectionString =
  env.POSTGRES_URL_NON_POOLING || env.POSTGRES_URL || env.DATABASE_URL;
if (!connectionString) {
  console.error("Missing POSTGRES_URL / POSTGRES_URL_NON_POOLING in .env.local");
  process.exit(1);
}

const sqlFile = process.argv[2] || "supabase-blocked-dates.sql";
const sqlPath = path.join(root, sqlFile);
if (!fs.existsSync(sqlPath)) {
  console.error("Missing SQL file:", sqlPath);
  process.exit(1);
}
const sql = fs.readFileSync(sqlPath, "utf8");

const isLocal =
  connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

const strict =
  env.POSTGRES_TLS_STRICT?.trim() === "1" ||
  String(env.POSTGRES_TLS_STRICT || "").toLowerCase() === "true";
/** Default: relaxed TLS for Supabase pooler. Set POSTGRES_TLS_STRICT=1 if your CA chain verifies. */
const client = new pg.Client({
  connectionString,
  ssl: isLocal ? undefined : { rejectUnauthorized: strict },
});
await client.connect();
try {
  await client.query(sql);
  console.log("OK: SQL applied:", sqlFile);
} finally {
  await client.end();
}
