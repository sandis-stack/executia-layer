import { db } from "../../services/db.js";
import { requireInternalKey } from "../../services/auth.js";
import { resolveJwtContext, requireJwtPermission } from "../../services/jwt-auth.js";
import { ok, fail, methodGuard } from "../../shared/response.js";

export default async function handler(req, res) {
  try {
    if (!methodGuard(req, res, ["GET"])) return;

    const internalAuth = requireInternalKey(req);

    let auth = {
      ok: true,
      mode: "INTERNAL_KEY",
      organization_id: null,
      user: "system"
    };

    if (!internalAuth.ok) {
      auth = await resolveJwtContext(req);

      if (!auth.ok) {
        return fail(
          res,
          auth.error || "UNAUTHORIZED",
          auth.error || "JWT auth failed.",
          auth.status || 401
        );
      }

      const permission = requireJwtPermission(auth, "view");

      if (!permission.ok) {
        return fail(
          res,
          permission.error || "FORBIDDEN",
          permission.reason || "Forbidden.",
          permission.status || 403
        );
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
      mode: auth.mode,
      organization_id: auth.organization_id,
      user: auth.user,
      executions: data || [],
      items: data || []
    });

  } catch (e) {
    return fail(
      res,
      "HISTORY_FAILED",
      e.message || "History failed.",
      500
    );
  }
}
