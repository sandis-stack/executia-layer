/**
 * EXECUTIA™ — /middleware/with-engine.js
 */

import { requireApiKey } from "./auth.js";
import { requireSession } from "./auth-session.js";
import { attachTenant } from "./tenant.js";
import { attachRequestId } from "./request-id.js";
import { checkRateLimit } from "./rate-limit.js";
import { startTimer } from "../services/monitoring.js";

const BASE_HEADERS = {
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key, x-organization-id, x-user-id, x-plan",
};

function applyCors(req, res) {
  const allowed = (process.env.ALLOWED_ORIGIN || "").split(",").map(v => v.trim()).filter(Boolean);
  const origin = req.headers.origin;
  Object.entries(BASE_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  if (!origin && allowed.length) {
    res.setHeader("Vary", "Origin");
    return;
  }

  if (!allowed.length) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CORS_MISCONFIGURED: ALLOWED_ORIGIN required in production");
    }
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader("Vary", "Origin");
    return;
  }

  if (allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    return;
  }

  if (origin) {
    throw new Error(`CORS_BLOCKED: origin ${origin} not allowed`);
  }
}

function assertRuntimeSafety() {
  if (process.env.NODE_ENV === "production") {
    if (process.env.ALLOW_SIMULATE === "true") throw new Error("CONFIG_UNSAFE: ALLOW_SIMULATE must be false in production");
    if (process.env.EXECUTIA_DEV_MODE === "true") throw new Error("CONFIG_UNSAFE: EXECUTIA_DEV_MODE must be false in production");
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) throw new Error("CONFIG_UNSAFE: Supabase credentials required in production");
    if (!process.env.ALLOWED_ORIGIN) throw new Error("CONFIG_UNSAFE: ALLOWED_ORIGIN required in production");
    if (process.env.DEFAULT_PROVIDER === "mock_bank") throw new Error("CONFIG_UNSAFE: DEFAULT_PROVIDER cannot be mock_bank in production");
    if (process.env.EXECUTIA_REQUIRE_PROVIDER !== "false" && !process.env.DEFAULT_PROVIDER) throw new Error("CONFIG_UNSAFE: DEFAULT_PROVIDER required when EXECUTIA_REQUIRE_PROVIDER is enabled");
    if (!process.env.WEBHOOK_CALLBACK_SECRET) throw new Error("CONFIG_UNSAFE: WEBHOOK_CALLBACK_SECRET required in production");
    if (process.env.EXECUTIA_DB_KEYS_ENABLED !== "true") throw new Error("CONFIG_UNSAFE: EXECUTIA_DB_KEYS_ENABLED must be true in production");
    if (!process.env.EXECUTIA_OPERATOR_BOOTSTRAP_PASSWORD_HASH) throw new Error("CONFIG_UNSAFE: EXECUTIA_OPERATOR_BOOTSTRAP_PASSWORD_HASH required in production");
  }
}

export function withEngine(handler, options = {}) {
  const { methods = ["POST"], requireAuth = true, rateLimit = true, requiredScope = null, sessionAuth = false } = options;
  return function(req, res) {
    try {
      assertRuntimeSafety();
      applyCors(req, res);
    } catch (err) {
      return res.status(500).json({ ok: false, error_code: "CONFIG_ERROR", error_message: err.message });
    }

    if (req.method === "OPTIONS") return res.status(200).end();
    if (!methods.includes(req.method)) {
      return res.status(405).json({ ok: false, error_code: "METHOD_NOT_ALLOWED", error_message: `Use: ${methods.join(", ")}` });
    }

    const timer = startTimer(req.url || "unknown");

    function runChain(fns, onDone) {
      let i = 0;
      function next(err) {
        if (err) return onDone(err);
        if (i >= fns.length) return onDone(null);
        fns[i++](req, res, next);
      }
      next(null);
    }

    const chain = [attachRequestId];
    if (requireAuth) chain.push(requireApiKey);
    if (sessionAuth) chain.push(requireSession);
    chain.push(attachTenant);

    runChain(chain, async (err) => {
      if (err) {
        const msg = err.message;
        const isAuth = msg === "UNAUTHORIZED" || msg === "UNAUTHORIZED_SESSION" || msg === "SESSION_EXPIRED" || msg.includes("UNAUTHORIZED_ORG_SCOPE");
        const isMisconfig = msg.includes("AUTH_MISCONFIGURED") || msg.includes("CONFIG_UNSAFE") || msg.includes("CORS_MISCONFIGURED");
        const isTenantError = msg.includes("TENANT_SCOPE_ERROR");
        const isCorsBlocked = msg.includes("CORS_BLOCKED");
        const status = isAuth ? 401 : isTenantError ? 400 : isCorsBlocked ? 403 : 500;
        const code = isAuth ? "INVALID_API_KEY" : isTenantError ? "TENANT_SCOPE_ERROR" : isCorsBlocked ? "CORS_BLOCKED" : isMisconfig ? "CONFIG_ERROR" : "ENGINE_ERROR";
        timer.end({ status, error: code });
        return res.status(status).json({ ok: false, error_code: code, error_message: msg, request_id: req.executia?.requestId || null });
      }

      if (requiredScope) {
        const scopes = req.executia?.auth?.scopes || [];
        if (!(scopes.includes("admin") || scopes.includes(requiredScope))) {
          timer.end({ status: 403, error: "UNAUTHORIZED_SCOPE" });
          return res.status(403).json({ ok: false, error_code: "UNAUTHORIZED_SCOPE", error_message: `Missing required scope: ${requiredScope}`, request_id: req.executia?.requestId });
        }
      }

      if (rateLimit) {
        const sessionId = req.body?.sessionId || req.executia?.organizationId || "anon";
        const rateErr = await checkRateLimit(sessionId, req.executia?.plan);
        if (rateErr) {
          timer.end({ status: rateErr.status || 429, error: rateErr.body?.error_code || "RATE_LIMIT_EXCEEDED" });
          return res.status(rateErr.status || 429).json({ ...rateErr.body, request_id: req.executia?.requestId });
        }
      }

      try {
        await handler(req, res);
        timer.end({ status: res.statusCode || 200 });
      } catch (handlerErr) {
        console.error(`[EXECUTIA][${req.executia?.requestId}] Unhandled:`, handlerErr);
        timer.end({ status: 500, error: handlerErr.message });
        return res.status(500).json({ ok: false, error_code: "ENGINE_ERROR", error_message: "Internal engine error", error_detail: handlerErr.message, request_id: req.executia?.requestId || null });
      }
    });
  };
}
