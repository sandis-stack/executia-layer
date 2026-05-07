import { db } from "../../services/db.js";
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

    const permission = requirePermission(auth, "view");
    if (!permission.ok) {
      return res.status(permission.status || 403).json({
        ok: false,
        error: permission.error || "FORBIDDEN",
        reason: permission.reason
      });
    }

    const execution_id = req.query?.execution_id;

    if (!execution_id) {
      return res.status(400).json({
        ok: false,
        error: "EXECUTION_ID_REQUIRED"
      });
    }

    let execQuery = db()
      .from("execution_results")
      .select("execution_id, organization_id")
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

    const { data, error } = await db()
      .from("audit_events")
      .select("*")
      .eq("execution_id", execution_id)
      .order("created_at", { ascending: true });

    if (error) {
      return res.status(500).json({
        ok: false,
        error: error.message
      });
    }

    return res.status(200).json({
      ok: true,
      mode: auth.mode,
      organization_id: auth.organization_id,
      execution_id,
      timeline: data || []
    });

  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message || "TIMELINE_FAILED"
    });
  }
}
