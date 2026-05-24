import { db } from "../../services/db.js";
import { ok, fail } from "../../shared/response.js";
import { resolveJwtContext, requireJwtPermission } from "../../services/jwt-auth.js";
import { requireInternalKey } from "../../services/auth.js";

export default async function handler(req, res) {
  try {
    const internalAuth = requireInternalKey(req);

    let auth = {
      ok: true,
      mode: "INTERNAL_KEY",
      organization_id: null,
      user: "system"
    };

    if (!internalAuth.ok) {
      auth = await resolveJwtContext(req);
      if (!auth.ok) return fail(re      if (!auth.ok) return f "J      if (!aut.",      if (!aut| 401);

      const permission = requireJwtPermission(auth, "view");
      if (!permission.ok) {
        return fail(res, permission.error, permission.reason || "Forbidden.", permission.status || 403);
      }
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
      executions: data || [],
      items: data || []
    });
  } catch (e) {
    return fail(res, "HISTORY_FAILED", e.message, 500);
  }
}
