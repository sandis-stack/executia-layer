import { db, hasSupabaseEnv } from "../../services/db.js";
import { resolveEnterpriseContext, requirePermission } from "../../services/enterprise-auth.js";
import { ok, fail, methodGuard } from "../../shared/response.js";

export default async function handler(req, res) {
  try {
    const ctx = await resolveEnterpriseContext(req);
    if (!ctx.ok) return res.status(ctx.status || 401).json({ ok: false, error: ctx.error });

    if (req.method === "GET") {
      if (!hasSupabaseEnv()) return ok(res, { organizations: [] });

      const { data, error } = await db()
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return ok(res, { organizations: data || [] });
    }

    if (req.method === "POST") {
      const perm = requirePermission(ctx, "manage_users");
      if (!perm.ok) return res.status(perm.status || 403).json({ ok: false, error: perm.error });

      const { name, type = "ENTERPRISE" } = req.body || {};
      if (!name) return fail(res, "NAME_REQUIRED", "Organization name is required.", 400);

      const { data, error } = await db()
        .from("organizations")
        .insert({ name, type })
        .select()
        .single();

      if (error) throw error;
      return ok(res, { organization: data }, 201);
    }

    if (!methodGuard(req, res, ["GET", "POST"])) return;

  } catch (err) {
    return fail(res, err.code || "ORGANIZATIONS_FAILED", err.message, 500);
  }
}
