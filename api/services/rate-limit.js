/**
 * EXECUTIA™ — /api/services/rate-limit.js
 *
 * Supabase-backed rate limiting for critical execution endpoints.
 * Works across serverless instances (no shared in-memory state).
 *
 * Limits (per 60s window):
 *   execute:  20 req / IP
 *   gateway:  20 req / IP
 *   override: 10 req / IP   (operator action — tighter)
 *   result:   30 req / IP   (provider callback — looser)
 *   default:  30 req / IP
 *
 * Returns null if allowed, or { status, body } if blocked.
 */

import { createClient } from "@supabase/supabase-js";

const WINDOW_MS = 60 * 1000;  // 60 second window

const LIMITS = {
  execute:          20,
  gateway:          20,
  override:         10,
  result:           30,
  "validate-project": 15,
  default:          30,
};

function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.connection?.remoteAddress ||
    "unknown"
  );
}

/**
 * Check rate limit for a request.
 * @param {object} req   - Incoming request
 * @param {string} endpoint - e.g. "execute", "gateway"
 * @returns {null | { status, body }} — null = allowed, object = blocked
 */
export async function checkRateLimit(req, endpoint) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // If Supabase not configured, skip (don't block on misconfiguration)
  if (!url || !key) return null;

  const limit      = LIMITS[endpoint] || LIMITS.default;
  const ip         = getClientIp(req);
  const now        = new Date();
  const windowStart = new Date(Math.floor(now.getTime() / WINDOW_MS) * WINDOW_MS);
  const bucketKey  = `${endpoint}:${ip}:${windowStart.toISOString()}`;

  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } });

    const { data: existing } = await supabase
      .from("engine_rate_limits")
      .select("request_count")
      .eq("bucket_key", bucketKey)
      .maybeSingle();

    const nextCount = (existing?.request_count || 0) + 1;

    if (nextCount > limit) {
      const retryAfter = Math.ceil(
        (windowStart.getTime() + WINDOW_MS - now.getTime()) / 1000
      );

      return {
        status: 429,
        body: {
          ok:          false,
          error:       "RATE_LIMIT_EXCEEDED",
          message:     `Too many requests. Limit: ${limit} per 60 seconds.`,
          retry_after: retryAfter,
          endpoint
        }
      };
    }

    // Upsert counter — best-effort, don't block on failure
    await supabase
      .from("engine_rate_limits")
      .upsert({
        bucket_key:    bucketKey,
        endpoint,
        request_count: nextCount,
        window_start:  windowStart.toISOString(),
        updated_at:    now.toISOString()
      })
      .catch(err => console.warn("RATE_LIMIT_UPSERT_FAILED:", err.message));

    return null; // allowed

  } catch (err) {
    // Rate limit store failure should never block legitimate requests
    console.warn("RATE_LIMIT_CHECK_FAILED:", err.message);
    return null;
  }
}
