/**
 * POST /api/v1/submit — PUBLIC endpoint.
 * Browser sends NO api key. Server uses env internally.
 *
 * EXECUTION = ATOMIC TRUTH OBJECT
 * One DB function. One transaction. Zero partial states.
 */
import { createExecution } from "../../services/execution.js";
import { ok, fail } from "../../shared/response.js";

const ALLOWED = new Set(["PAYMENT","PROCUREMENT","APPROVAL","TRANSFER","CONTRACT","AUDIT_REQUEST"]);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  const body = req.body || {};

  // Input validation
  const missing = ["request_type","actor","subject"].filter(k => !body[k]);
  if (missing.length) return fail(res, "VALIDATION_FAILED", `Missing: ${missing.join(", ")}`, 400);
  if (!ALLOWED.has(body.request_type)) return fail(res, "INVALID_REQUEST_TYPE", `Allowed: ${[...ALLOWED].join(", ")}`, 400);

  try {
    const data = await createExecution(body);
    return ok(res, data, 201);
  } catch (error) {
    if (error.code === "RPC_NOT_DEPLOYED") {
      return fail(res, "RPC_NOT_DEPLOYED",
        "Run sql/009_atomic_execution_rpc.sql and sql/009b_canonical_evaluation_bridge.sql in Supabase SQL Editor first.", 503);
    }
    throw error;
  }
}
