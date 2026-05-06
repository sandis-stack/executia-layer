/**
 * POST /api/v1/submit — PUBLIC endpoint.
 * Browser sends NO api key. Server uses env internally.
 *
 * EXECUTION = ATOMIC TRUTH OBJECT
 * One DB function. One transaction. Zero partial states.
 */
import { db, hasSupabaseEnv } from "../../services/db.js";
import { ok, fail } from "../../shared/response.js";
import { evaluateRules } from "../../engine/rule-evaluator.js";
import { createExecutionId } from "../../shared/crypto.js";

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

  // DRY RUN — no Supabase env
  if (!hasSupabaseEnv()) {
    const rule = evaluateRules(body);
    return ok(res, {
      execution_id: createExecutionId(),
      status:   rule.decision === "APPROVE" ? "APPROVED" : rule.decision === "BLOCK" ? "BLOCKED" : "PENDING_REVIEW",
      decision: rule.decision,
      reason:   rule.reason,
      mode:     "DRY_RUN"
    }, 201);
  }

  // LIVE — single atomic DB transaction
  // Decision logic runs inside the RPC (see sql/009_atomic_execution_rpc.sql)
  const { data, error } = await db().rpc("commit_execution", { payload: body });

  if (error) {
    if (error.message?.includes("commit_execution")) {
      return fail(res, "RPC_NOT_DEPLOYED",
        "Run sql/009_atomic_execution_rpc.sql in Supabase SQL Editor first.", 503);
    }
    throw error;
  }

  return ok(res, data, 201);
}
