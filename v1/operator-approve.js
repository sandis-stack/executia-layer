import { applyOperatorDecision } from "../../services/execution.js";
import { requireInternalKey } from "../../services/auth.js";

export default async function handler(req, res) {
  try {
    const auth = requireInternalKey(req);
    if (!auth.ok) return res.status(401).json({ ok: false, error: auth.error || "UNAUTHORIZED" });

    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
    }

    const { execution_id, actor, reason } = req.body || {};

    if (!execution_id) {
      return res.status(400).json({ ok: false, error: "EXECUTION_ID_REQUIRED" });
    }

    const result = await applyOperatorDecision({
      execution_id,
      decision: "APPROVE",
      actor: actor || "operator",
      reason: reason || "Operator approved execution"
    });

    return res.status(200).json({
      ok: true,
      decision: "APPROVE",
      result
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.code || err.message || "OPERATOR_APPROVE_FAILED"
    });
  }
}
