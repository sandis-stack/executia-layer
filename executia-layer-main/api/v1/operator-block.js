import { applyOperatorDecision } from "../../services/execution.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
    }

    const { execution_id, actor, reason } = req.body || {};

    if (!execution_id) {
      return res.status(400).json({ ok: false, error: "EXECUTION_ID_REQUIRED" });
    }

    const result = await applyOperatorDecision({
      execution_id,
      decision: "BLOCK",
      actor: actor || "operator",
      reason: reason || "Operator blocked execution"
    });

    return res.status(200).json({
      ok: true,
      decision: "BLOCK",
      result
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.code || err.message || "OPERATOR_BLOCK_FAILED"
    });
  }
}
