/**
 * Apply supabase-blocked-dates.sql using Postgres URL from .env.local.
 *
 * 1) npx vercel env pull .env.local --environment production --yes
 * 2) npm install pg@8 --no-save
 * 3) PowerShell (Supabase pooler TLS on Windows):
 *    $env:NODE_TLS_REJECT_UNAUTHORIZED = "0"; node scripts/apply-blocked-dates.mjs
 *    Optional: node scripts/apply-blocked-dates.mjs supabase-booking-requests.sql
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
    env[key] = val.replace(/\\n/g, "\n");
  }
  return env;
}

const env = loadEnv(path.join(root, ".env.local"));
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

/** Supabase pooler uses a chain Node may reject; keep TLS on but skip CA verify for this one-off script. */
const client = new pg.Client({
  connectionString,
  ssl: isLocal ? undefined : { rejectUnauthorized: false },
});
await client.connect();
try {
  await client.query(sql);
  console.log("OK: SQL applied:", sqlFile);
} finally {
  await client.end();
}
