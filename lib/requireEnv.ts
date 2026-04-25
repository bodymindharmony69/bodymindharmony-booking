/** Throws if env is missing or blank (after trim). */
export function requireEnv(name: string): string {
  const v = process.env[name];
  if (v === undefined || v === null || String(v).trim() === "") {
    throw new Error("Missing env: " + name);
  }
  return String(v).trim();
}
