import { applyOperatorDecision } from "../../services/execution.js";
import { ok, fail, methodGuard } from "../../shared/response.js";
import { requireInternalKey } from "../../services/auth.js";

export default async function handler(req, res) {
  try {
    const auth = requireInternalKey(req);
    if (!auth.ok) return fail(res, "UNAUTHORIZED", "Invalid EXECUTIA internal key.", 401);

    if (!methodGuard(req, res, ["POST"])) return;

    const { execution_id, decision, actor, reason } = req.body || {};
    if (!execution_id) return fail(res, "EXECUTION_ID_REQUIRED", "execution_id is required.");
    if (!decision) return fail(res, "DECISION_REQUIRED", "decision is required.");

    const result = await applyOperatorDecision({ execution_id, decision, actor, reason });
    return ok(res, result);
  } catch (error) {
    return fail(res, error.code || "OPERATOR_DECISION_FAILED", error.message || "Operator decision failed.", 500);
  }
}
