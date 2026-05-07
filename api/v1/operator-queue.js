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
      user: auth.user,
      items: data || []
    });
  } catch (error) {
    return fail(res, "QUEUE_FAILED", error.message || "Queue failed.", 500);
  }
}
