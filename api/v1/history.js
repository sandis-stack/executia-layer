import { db } from "../../services/db.js";
import { ok, fail } from "../../shared/response.js";
import { resolveEnterpriseContext, requirePermission } from "../../services/enterprise-auth.js";

export default async function handler(req, res) {
  try {
    const auth = await resolveEnterpriseContext(req);
    if (!auth.ok) return fail(res, auth.error, auth.error || "Authentication failed.", auth.status || 401);

    const permission = requirePermission(auth, "view");
    if (!permission.ok) {
      return fail(res, permission.error, permission.reason || "Forbidden.", permission.status || 403);
    }

    let query = db()
      .from("execution_results")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (auth.organization_id) {
      query = query.eq("organization_id", auth.organization_id);
    }

    const { data, error } = await query;
    if (error) throw error;

    return ok(res, {
      ok: true,
      mode: auth.mode,
      organization_id: auth.organization_id,
      executions: data || []
    });
  } catch (e) {
    return fail(res, "HISTORY_FAILED", e.message, 500);
  }
}
