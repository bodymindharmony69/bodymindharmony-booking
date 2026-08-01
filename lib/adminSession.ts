import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "bmh_admin_session";
const MAX_AGE_SECONDS = 8 * 60 * 60;

function secret(): string {
  const value = process.env.ADMIN_SECRET?.trim();
  if (!value) throw new Error("Missing env: ADMIN_SECRET");
  return value;
}

function signature(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createAdminSession(): string {
  const expires = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const payload = String(expires);
  return `${payload}.${signature(payload)}`;
}

export function isValidAdminSession(token: string | undefined): boolean {
  if (!token) return false;
  const [payload, supplied, extra] = token.split(".");
  if (!payload || !supplied || extra || !/^\d+$/.test(payload)) return false;
  if (Number(payload) < Math.floor(Date.now() / 1000)) return false;
  const expected = signature(payload);
  const left = Buffer.from(supplied);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export const adminCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};
