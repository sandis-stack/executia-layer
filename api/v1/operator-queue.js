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
      .eq("status", "PENDING_REVIEW")
      .order("created_at", { ascending: true })
      .limit(100);

    if (auth.organization_id) {
      query = query.eq("organization_id", auth.organization_id);
    }

    const { data, error } = await query;
    if (error) throw error;

    return ok(res, {
      mode: auth.mode,
      organization_id: auth.organization_id,
      items: data || []
    });
  } catch (error) {
    return fail(res, "QUEUE_FAILED", error.message || "Queue failed.", 500);
  }
}
