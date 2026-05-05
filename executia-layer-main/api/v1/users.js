import { db, hasSupabaseEnv } from "../../services/db.js";
import { resolveEnterpriseContext, requirePermission } from "../../services/enterprise-auth.js";
import { ok, fail, methodGuard } from "../../shared/response.js";

export default async function handler(req, res) {
  try {
    const ctx = await resolveEnterpriseContext(req);
    if (!ctx.ok) return res.status(ctx.status || 401).json({ ok: false, error: ctx.error });

    if (req.method === "GET") {
      if (!hasSupabaseEnv()) return ok(res, { users: [] });

      const filter = ctx.organization_id
        ? db().from("organization_users").select("*").eq("organization_id", ctx.organization_id)
        : db().from("organization_users").select("*");

      const { data, error } = await filter.order("created_at", { ascending: false });
      if (error) throw error;
      return ok(res, { users: data || [] });
    }

    if (req.method === "POST") {
      const perm = requirePermission(ctx, "manage_users");
      if (!perm.ok) return res.status(perm.status || 403).json({ ok: false, error: perm.error });

      const { organization_id, email, role = "VIEWER" } = req.body || {};
      const org_id = organization_id || ctx.organization_id;

      if (!org_id)  return fail(res, "ORGANIZATION_ID_REQUIRED", "organization_id is required.", 400);
      if (!email)   return fail(res, "EMAIL_REQUIRED", "email is required.", 400);

      const { data, error } = await db()
        .from("organization_users")
        .insert({ organization_id: org_id, email, role })
        .select()
        .single();

      if (error) throw error;
      return ok(res, { user: data }, 201);
    }

    if (!methodGuard(req, res, ["GET", "POST"])) return;

  } catch (err) {
    return fail(res, err.code || "USERS_FAILED", err.message, 500);
  }
}
