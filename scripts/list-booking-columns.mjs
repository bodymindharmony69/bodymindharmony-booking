/**
 * Lists public.booking_requests columns (uses .env.local Postgres URL).
 * Run: node scripts/list-booking-columns.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadEnv(filePath) {
  const env = {};
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

const envFile = process.argv[2] || ".env.local";
const env = loadEnv(path.join(root, envFile));
const connectionString =
  env.POSTGRES_URL_NON_POOLING || env.POSTGRES_URL || env.DATABASE_URL;
const isLocal =
  connectionString.includes("localhost") || connectionString.includes("127.0.0.1");
const client = new pg.Client({
  connectionString,
  ssl: isLocal ? undefined : { rejectUnauthorized: false },
});
await client.connect();
const r = await client.query(
  `select column_name, data_type from information_schema.columns
   where table_schema = 'public' and table_name = 'booking_requests'
   order by ordinal_position`,
);
console.table(r.rows);
await client.end();
