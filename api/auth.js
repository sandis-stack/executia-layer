/**
 * EXECUTIA™ — /core/api/auth.js
 * API key middleware for all engine endpoints.
 *
 * Usage:
 *   import { requireApiKey } from "../core/api/auth.js";
 *   if (!requireApiKey(req, res)) return;
 *
 * Set env var: EXECUTIA_API_KEY=your_secret_key
 */

/**
 * Validates x-api-key header.
 * Returns true if valid (or if no key configured — dev mode).
 * Returns false and sends 401 if invalid.
 */
export function requireApiKey(req, res) {
  const validKey = process.env.EXECUTIA_API_KEY;

  // Dev mode — no key configured, allow all
  if (!validKey) {
    console.warn("[EXECUTIA] WARNING: EXECUTIA_API_KEY not set — running in open mode");
    return true;
  }

  const provided = req.headers["x-api-key"];

  if (!provided || provided !== validKey) {
    res.status(401).json({
      error:   "Unauthorized",
      code:    "INVALID_API_KEY",
      message: "Valid x-api-key header required"
    });
    return false;
  }

  return true;
}

/**
 * Rate limiting by session ID (in-memory, resets on deploy).
 * For production: replace with Redis or Supabase-backed counter.
 */
const rateLimitMap = new Map();
const RATE_LIMIT   = 60;  // requests
const RATE_WINDOW  = 60 * 1000; // 1 minute

export function checkRateLimit(req, res) {
  // Rate limit by sessionId (from body) — NOT by API key
  // This ensures different clients with same API key don't share limits
  const sessionId = req.body?.sessionId || req.ip || "anon";
  const now       = Date.now();

  if (!rateLimitMap.has(sessionId)) {
    rateLimitMap.set(sessionId, { count: 1, windowStart: now });
    return true;
  }

  const entry = rateLimitMap.get(sessionId);

  // Reset window
  if (now - entry.windowStart > RATE_WINDOW) {
    entry.count = 1;
    entry.windowStart = now;
    return true;
  }

  entry.count++;

  if (entry.count > RATE_LIMIT) {
    res.status(429).json({
      error:   "Rate limit exceeded",
      code:    "RATE_LIMIT",
      message: `Max ${RATE_LIMIT} requests per minute`,
      retryAfter: Math.ceil((entry.windowStart + RATE_WINDOW - now) / 1000)
    });
    return false;
  }

  return true;
}
