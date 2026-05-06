import { createExecution, listExecutions } from "../../services/execution.js";
import { ok, fail } from "../../shared/response.js";
import { requireInternalKey } from "../../services/auth.js";
import { resolveEnterpriseContext, requirePermission } from "../../services/enterprise-auth.js";

export default async function handler(req, res) {
  try {
    // GET without key: return engine info (public, no auth required)
    if (req.method === "GET") {
      const incomingKey = req.headers["x-api-key"] || req.headers["x-executia-key"];

      // Authenticated GET → return execution list
      if (incomingKey) {
        const auth = requireInternalKey(req);
        if (!auth.ok) return fail(res, auth.error, "Invalid API key.", 401);

        const items = await listExecutions(Number(req.query?.limit || 50));
        return ok(res, { items, auth: auth.mode });
      }

      // Unauthenticated GET → return engine status (useful for browser checks)
      return ok(res, {
        engine:  "EXECUTIA™",
        status:  "ONLINE",
        version: "core-1.0",
        hint:    "POST with x-api-key header to create executions. GET with x-api-key to list."
      });
    }

    // POST: requires auth
    if (req.method === "POST") {
      const auth = await resolveEnterpriseContext(req);

      if (!auth.ok) {
        // Debug: log what was expected vs received (visible in Vercel logs)
        const expected = process.env.EXECUTIA_API_KEY || process.env.EXECUTIA_INTERNAL_KEY;
        const received = req.headers["x-api-key"] || req.headers["x-executia-key"] || "(none)";
        console.error("[EXECUTIA AUTH FAIL]", {
          key_configured: !!expected,
          key_env_name:   process.env.EXECUTIA_API_KEY ? "EXECUTIA_API_KEY" : process.env.EXECUTIA_INTERNAL_KEY ? "EXECUTIA_INTERNAL_KEY" : "NONE",
          received_header: received === "(none)" ? "(none)" : received.slice(0, 8) + "...",
          error: auth.error
        });

        return fail(res, auth.error, auth.error || "Authentication failed.", auth.status || 401);
      }

      const permission = requirePermission(auth, "execute");
      if (!permission.ok) {
        return fail(res, permission.error, permission.reason || "Forbidden.", permission.status || 403);
      }

      const body = {
        ...(req.body || {}),
        organization_id: auth.organization_id || req.body?.organization_id || null
      };

      const result = await createExecution(body);
      return ok(res, result, 201);
    }

    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED", allowed: ["GET", "POST"] });

  } catch (error) {
    console.error("[EXECUTIA EXECUTE ERROR]", error.message);
    return fail(res, error.code || "EXECUTION_FAILED", error.message || "Execution failed.", 500);
  }
}
