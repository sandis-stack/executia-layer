import { db } from "../../services/db.js";
import { applyOperatorDecision } from "../../services/execution.js";
import { resolveEnterpriseContext, requirePermission } from "../../services/enterprise-auth.js";

export default async function handler(req, res) {
  try {
    const auth = await resolveEnterpriseContext(req);

    if (!auth.ok) {
      return res.status(auth.status || 401).json({
        ok: false,
        error: auth.error || "UNAUTHORIZED"
      });
    }

    const permission = requirePermission(auth, "block");
    if (!permission.ok) {
      return res.status(permission.status || 403).json({
        ok: false,
        error: permission.error || "FORBIDDEN",
        reason: permission.reason
      });
    }

    if (req.method !== "POST") {
      return res.status(405).json({
        ok: false,
        error: "METHOD_NOT_ALLOWED"
      });
    }

    const { execution_id, actor, reason } = req.body || {};

    if (!execution_id) {
      return res.status(400).json({
        ok: false,
        error: "EXECUTION_ID_REQUIRED"
      });
    }

    let execQuery = db()
      .from("execution_results")
      .select("execution_id, organization_id, status")
      .eq("execution_id", execution_id)
      .single();

    if (auth.organization_id) {
      execQuery = execQuery.eq("organization_id", auth.organization_id);
    }

    const { data: execution, error: execError } = await execQuery;

    if (execError || !execution) {
      return res.status(404).json({
        ok: false,
        error: "EXECUTION_NOT_FOUND"
      });
    }

    const result = await applyOperatorDecision({
      execution_id,
      decision: "BLOCK",
      actor: actor || auth.user?.email || "operator",
      reason: reason || "Operator blocked execution"
    });

    return res.status(200).json({
      ok: true,
      mode: auth.mode,
      organization_id: auth.organization_id,
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
