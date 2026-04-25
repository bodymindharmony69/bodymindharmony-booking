/**
 * Pull latest Vercel Production env → push merged keys back (fills gaps) → deploy --prod.
 */
import { execFileSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const isWin = process.platform === "win32";
const env = { ...process.env, VERCEL_NONINTERACTIVE: "1" };

function runNpxVercel(args, inherit = true) {
  const stdio = inherit ? "inherit" : "pipe";
  if (isWin) {
    execFileSync("cmd.exe", ["/c", "npx", "vercel", ...args], { cwd: root, stdio, env });
  } else {
    execFileSync("npx", ["vercel", ...args], { cwd: root, stdio, env });
  }
}

console.log("Step 1/3: vercel env pull (production)…");
try {
  runNpxVercel([
    "env",
    "pull",
    ".env.vercel.production",
    "--environment",
    "production",
    "--yes",
  ]);
} catch (e) {
  console.log("(pull failed or not linked — continuing with local files only)");
}

console.log("Step 2/3: push merged env to production…");
execFileSync(process.execPath, [path.join(root, "scripts", "push-production-env-from-local.mjs")], {
  cwd: root,
  stdio: "inherit",
  env,
});

console.log("Step 3/3: vercel --prod deploy…");
runNpxVercel(["--prod", "--yes"]);
console.log("Done.");
