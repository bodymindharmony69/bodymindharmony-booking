/**
 * Copy SUPABASE_URL (https) to NEXT_PUBLIC_SUPABASE_URL on Vercel (production + development).
 * Prereq: npx vercel env pull .env.vercel.production --environment production --yes
 *
 * Usage: node scripts/sync-next-public-supabase-url.mjs
 */
import { execSync } from "node:child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env.vercel.production");

if (!fs.existsSync(envPath)) {
  console.error("Missing .env.vercel.production. Run:");
  console.error("  npx vercel env pull .env.vercel.production --environment production --yes");
  process.exit(1);
}

let url = "";
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^SUPABASE_URL=(.*)$/);
  if (!m) continue;
  url = m[1].trim().replace(/^"|"$/g, "");
  break;
}

if (!url.startsWith("https://")) {
  console.error("SUPABASE_URL in .env.vercel.production must be an https:// URL.");
  process.exit(1);
}

const valueArg = JSON.stringify(url);

for (const target of ["production", "development"]) {
  console.error("Setting NEXT_PUBLIC_SUPABASE_URL for", target, "…");
  try {
    execSync(
      `npx vercel env add NEXT_PUBLIC_SUPABASE_URL ${target} --value ${valueArg} --yes --force --no-sensitive`,
      { cwd: root, stdio: "inherit", shell: true },
    );
  } catch {
    console.error("Skipped or failed:", target);
  }
}
console.error("Done.");
