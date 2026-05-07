import { db } from "../../services/db.js";
import { ok, fail } from "../../shared/response.js";
import { resolveJwtContext, requireJwtPermission } from "../../services/jwt-auth.js";

export default async function handler(req, res) {
  try {
    const auth = await resolveJwtContext(req);
    if (!auth.ok) return fail(res, auth.error, auth.error || "JWT auth failed.", auth.status || 401);

    const permission = requireJwtPermission(auth, "view");
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
      user: auth.user,
      executions: data || []
    });
  } catch (e) {
    return fail(res, "HISTORY_FAILED", e.message, 500);
  }
}
