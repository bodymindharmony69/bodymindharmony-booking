import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

function sign(payload: string): string {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) throw new Error("Missing env: ADMIN_SECRET");
  return createHmac("sha256", secret).update(`google-oauth:${payload}`).digest("base64url");
}

export function createGoogleOAuthState(): string {
  const payload = `${Date.now()}.${randomUUID()}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyGoogleOAuthState(state: string | null): boolean {
  if (!state) return false;
  const parts = state.split(".");
  if (parts.length !== 3) return false;
  const payload = `${parts[0]}.${parts[1]}`;
  const issued = Number(parts[0]);
  if (!Number.isFinite(issued) || Date.now() - issued > 10 * 60 * 1000 || issued > Date.now() + 60_000) {
    return false;
  }
  const supplied = Buffer.from(parts[2]);
  const expected = Buffer.from(sign(payload));
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
