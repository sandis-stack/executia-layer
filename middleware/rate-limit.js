
/**
 * EXECUTIA™ — /middleware/rate-limit.js
 * Supabase-backed rate limiting per tenant/session.
 */

import { ERROR_CODES } from "../engine/error-codes.js";
import { createSupabaseAdmin } from "../services/supabase-admin.js";

const LIMITS = { free: 30, pro: 120, enterprise: 600 };
const WINDOW_MS = 60 * 1000;

export async function checkRateLimit(sessionId, plan = "free") {
  const limit = LIMITS[plan] || LIMITS.free;
  const now = new Date();
  const windowStart = new Date(Math.floor(now.getTime() / WINDOW_MS) * WINDOW_MS).toISOString();
  const bucketKey = `${sessionId}:${windowStart}`;
  const supabase = createSupabaseAdmin();

  const { data: existing, error: readError } = await supabase
    .from("engine_rate_limits")
    .select("bucket_key, request_count, window_start")
    .eq("bucket_key", bucketKey)
    .maybeSingle();

  if (readError) {
    return {
      status: 500,
      body: {
        ok: false,
        error_code: "RATE_LIMIT_STORE_FAILED",
        error_message: readError.message,
      },
    };
  }

  const nextCount = (existing?.request_count || 0) + 1;
  if (nextCount > limit) {
    const retryAfter = Math.max(1, Math.ceil((new Date(windowStart).getTime() + WINDOW_MS - now.getTime()) / 1000));
    return {
      status: 429,
      body: {
        ok: false,
        error_code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
        error_message: `Rate limit: ${limit} requests/min`,
        retry_after: retryAfter,
      },
    };
  }

  const { error: upsertError } = await supabase
    .from("engine_rate_limits")
    .upsert({
      bucket_key: bucketKey,
      request_count: nextCount,
      window_start: windowStart,
      updated_at: now.toISOString(),
    });

  if (upsertError) {
    return {
      status: 500,
      body: {
        ok: false,
        error_code: "RATE_LIMIT_STORE_FAILED",
        error_message: upsertError.message,
      },
    };
  }

  return null;
}
