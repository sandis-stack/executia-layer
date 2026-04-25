/**
 * EXECUTIA™ — /middleware/tenant.js
 */
import { createSupabaseAdmin } from "../services/supabase-admin.js";

export async function attachTenant(req, res, next) {
  req.executia = req.executia || {};
  const bodyOrg = req.body?.organizationId || req.body?.organization_id || null;
  const headerOrg = req.headers["x-organization-id"] || null;
  const organizationId = headerOrg || bodyOrg || req.executia?.session?.organizationId || req.executia?.auth?.organizations?.[0] || null;

  if (!organizationId && req.method !== "GET") {
    return next(new Error("TENANT_SCOPE_ERROR: organization_id is required"));
  }

  req.executia.organizationId = organizationId;
  req.executia.plan = req.executia?.auth?.plan || req.headers["x-plan"] || null;
  req.executia.operatorId = req.executia?.session?.operatorId || req.executia?.auth?.operatorId || req.headers["x-operator-id"] || null;
  req.executia.operatorRole = null;

  if (req.executia.operatorId && organizationId) {
    try {
      const supabase = createSupabaseAdmin();
      const { data } = await supabase
        .from("operators")
        .select("id, role, email")
        .eq("id", req.executia.operatorId)
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (data) {
        req.executia.operatorRole = data.role;
        req.executia.operatorEmail = data.email || null;
      }
    } catch (err) {
      console.error("[EXECUTIA][TENANT] operator attach failed:", err.message);
    }
  }

  next();
}

export function requireScope(scope) {
  return function(req, res, next) {
    const scopes = req.executia?.auth?.scopes || [];
    if (!scopes.length || scopes.includes("admin") || scopes.includes(scope)) return next();
    return next(new Error(`UNAUTHORIZED_SCOPE: missing ${scope}`));
  };
}
