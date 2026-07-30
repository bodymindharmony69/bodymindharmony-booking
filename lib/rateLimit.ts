import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { createSupabaseAdmin } from "./supabaseAdmin";

export async function allowBookingRequest(request: NextRequest, email: string): Promise<boolean> {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) throw new Error("Missing env: ADMIN_SECRET");
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
  const fingerprint = createHmac("sha256", secret)
    .update(`${ip}|${email.trim().toLowerCase()}`)
    .digest("hex");
  const sb = createSupabaseAdmin();
  const { data, error } = await sb.rpc("check_booking_rate_limit", {
    p_fingerprint: fingerprint,
    p_limit: 5,
    p_window_seconds: 900,
  });
  if (error) throw new Error(error.message);
  return data === true;
}
