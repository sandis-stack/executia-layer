/**
 * EXECUTIA™ — /core/api/middleware.js
 * Centralized auth, tenant isolation, and request validation.
 *
 * Usage in any API endpoint:
 *   import { withAuth } from "../core/api/middleware.js";
 *   export default withAuth(async (req, res, tenant) => {
 *     // tenant = { orgId, projectIds, plan, sessionId }
 *     // all DB queries must be scoped to tenant.orgId
 *   });
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── RATE LIMIT (in-memory, resets on deploy) ─────────────────
const rateLimitMap  = new Map();
const RATE_LIMITS   = { free: 30, pro: 120, enterprise: 600 }; // per minute
const RATE_WINDOW   = 60 * 1000;

// ── API KEY CACHE (avoid DB lookup on every request) ─────────
const keyCache      = new Map();
const KEY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ── MAIN MIDDLEWARE ──────────────────────────────────────────

/**
 * Wraps an API handler with:
 *   1. CORS headers
 *   2. Method validation
 *   3. API key auth + tenant resolution
 *   4. Rate limiting (per session, plan-aware)
 *   5. Request logging
 *
 * @param {Function} handler - async (req, res, tenant) => void
 * @param {object}   options - { methods, requireAuth, skipRateLimit }
 */
export function withAuth(handler, options = {}) {
  const {
    methods      = ["POST"],
    requireAuth  = true,
    skipRateLimit = false,
  } = options;

  return async (req, res) => {
    const start = Date.now();

    // 1. CORS
    res.setHeader("Access-Control-Allow-Origin",  process.env.ALLOWED_ORIGIN || "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key, x-user-id");
    if (req.method === "OPTIONS") return res.status(200).end();

    // 2. Method check
    if (!methods.includes(req.method)) {
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }

    // 3. Auth
    let tenant = null;
    if (requireAuth) {
      const apiKey = req.headers["x-api-key"];

      if (!apiKey) {
        // Dev mode — check env var
        if (!process.env.EXECUTIA_API_KEY) {
          console.warn("[EXECUTIA] WARNING: No API key — open dev mode");
          tenant = devTenant(req);
        } else {
          return res.status(401).json({ error: "x-api-key required" });
        }
      } else {
        tenant = await resolveTenant(apiKey, req);
        if (!tenant) {
          return res.status(401).json({ error: "Invalid API key" });
        }
      }
    }

    // 4. Rate limit (per sessionId, plan-aware)
    if (!skipRateLimit && tenant) {
      const limited = checkRateLimit(tenant);
      if (limited) {
        return res.status(429).json({
          error:      "Rate limit exceeded",
          plan:       tenant.plan,
          limit:      RATE_LIMITS[tenant.plan] || 30,
          retryAfter: limited,
        });
      }
    }

    // 5. Execute handler
    try {
      await handler(req, res, tenant);
    } catch (err) {
      console.error(`[EXECUTIA] ${req.url} error:`, err);
      logRequest(req, tenant, 500, Date.now() - start, err.message);
      return res.status(500).json({ error: "Internal engine error", code: err.code });
    }

    logRequest(req, tenant, res.statusCode, Date.now() - start);
  };
}

// ── TENANT RESOLUTION ────────────────────────────────────────

async function resolveTenant(apiKey, req) {
  // Check cache first
  const cached = keyCache.get(apiKey);
  if (cached && Date.now() - cached.ts < KEY_CACHE_TTL) {
    return { ...cached.tenant, sessionId: getSessionId(req) };
  }

  // Lookup in DB
  try {
    const { data, error } = await supabase
      .from("api_keys")
      .select("organization_id, plan, active, project_ids")
      .eq("key_hash", hashKey(apiKey))
      .eq("active", true)
      .single();

    if (error || !data) return null;

    const tenant = {
      orgId:      data.organization_id,
      projectIds: data.project_ids || null, // null = all projects
      plan:       data.plan || "free",
    };

    keyCache.set(apiKey, { tenant, ts: Date.now() });
    return { ...tenant, sessionId: getSessionId(req) };

  } catch {
    // Fallback: check env var (single-tenant mode)
    if (apiKey === process.env.EXECUTIA_API_KEY) {
      return devTenant(req);
    }
    return null;
  }
}

/**
 * Validate that a projectId belongs to the tenant.
 * Call in handlers before any DB query with projectId.
 */
export function assertProjectAccess(tenant, projectId) {
  if (!tenant || !projectId) return;
  if (tenant.projectIds && !tenant.projectIds.includes(String(projectId))) {
    const err = new Error("Project access denied");
    err.code  = "PROJECT_ACCESS_DENIED";
    err.status = 403;
    throw err;
  }
}

/**
 * Scope a Supabase query to tenant's org.
 * Use on any table with organization_id column.
 */
export function scopeToTenant(query, tenant, column = "organization_id") {
  if (tenant?.orgId) {
    return query.eq(column, tenant.orgId);
  }
  return query; // dev mode: no scoping
}

// ── RATE LIMITING ────────────────────────────────────────────

function checkRateLimit(tenant) {
  const key   = tenant.sessionId || tenant.orgId || "anon";
  const limit = RATE_LIMITS[tenant.plan] || RATE_LIMITS.free;
  const now   = Date.now();

  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { count: 1, windowStart: now });
    return null;
  }

  const entry = rateLimitMap.get(key);

  if (now - entry.windowStart > RATE_WINDOW) {
    entry.count = 1;
    entry.windowStart = now;
    return null;
  }

  entry.count++;
  if (entry.count > limit) {
    const retryAfter = Math.ceil((entry.windowStart + RATE_WINDOW - now) / 1000);
    return retryAfter;
  }

  return null;
}

// ── HELPERS ──────────────────────────────────────────────────

function getSessionId(req) {
  return req.body?.sessionId || req.headers["x-user-id"] || req.ip || "anon";
}

function devTenant(req) {
  return { orgId: null, projectIds: null, plan: "enterprise", sessionId: getSessionId(req) };
}

function hashKey(key) {
  // Simple hash for DB lookup — use SHA-256 in production
  let h = 2166136261;
  for (const c of key) { h ^= c.charCodeAt(0); h = (h * 16777619) >>> 0; }
  return h.toString(16);
}

function logRequest(req, tenant, status, ms, error = null) {
  const log = {
    ts:      new Date().toISOString(),
    method:  req.method,
    url:     req.url,
    status,
    ms,
    orgId:   tenant?.orgId || null,
    plan:    tenant?.plan  || null,
    error:   error || undefined,
  };

  if (status >= 500) console.error("[EXECUTIA]", JSON.stringify(log));
  else if (status >= 400) console.warn("[EXECUTIA]", JSON.stringify(log));
  else if (process.env.NODE_ENV !== "production") console.log("[EXECUTIA]", JSON.stringify(log));
}
