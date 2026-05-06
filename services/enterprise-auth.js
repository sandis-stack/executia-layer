import { db, hasSupabaseEnv } from "./db.js";

// Role permission matrix
export const ROLE_PERMISSIONS = Object.freeze({
  ADMIN:     ["execute", "approve", "block", "audit", "settle", "manage_users", "view"],
  OPERATOR:  ["execute", "approve", "block", "view"],
  AUDITOR:   ["audit", "view"],
  REGULATOR: ["audit", "view"],
  VIEWER:    ["view"]
});

export function roleHasPermission(role, action) {
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.includes(action);
}

/**
 * Resolve caller identity from request headers.
 * Expects:
 *   x-api-key        — system-level key (existing)
 *   x-organization-id — tenant UUID
 *   x-user-email      — caller email (looked up against organization_users)
 */
export async function resolveEnterpriseContext(req) {
  const API_KEY = process.env.EXECUTIA_API_KEY || process.env.EXECUTIA_INTERNAL_KEY;

  const incoming = req.headers["x-api-key"] || req.headers["x-executia-key"];
  if (!API_KEY || incoming !== API_KEY) {
    return { ok: false, error: "UNAUTHORIZED", status: 401 };
  }

  const organization_id = req.headers["x-organization-id"] || null;
  const user_email      = req.headers["x-user-email"]      || null;

  // No org header — fall back to system-level access (backward compatible)
  if (!organization_id) {
    return {
      ok:              true,
      mode:            "SYSTEM",
      organization_id: null,
      user:            null,
      role:            "ADMIN",  // system calls have full access
      permissions:     ROLE_PERMISSIONS["ADMIN"]
    };
  }

  if (!hasSupabaseEnv()) {
    return {
      ok:              true,
      mode:            "DRY_RUN",
      organization_id,
      user:            null,
      role:            "ADMIN",
      permissions:     ROLE_PERMISSIONS["ADMIN"]
    };
  }

  // Verify organization exists and is active
  const { data: org, error: orgError } = await db()
    .from("organizations")
    .select("id, name, type, status")
    .eq("id", organization_id)
    .single();

  if (orgError || !org) {
    console.error("[EXECUTIA ORG LOOKUP FAILED]", {
      organization_id,
      orgError,
      org
    });

    return {
      ok: false,
      error: "ORGANIZATION_NOT_FOUND",
      status: 404
    };
  }
  if (org.status !== "ACTIVE") {
    return { ok: false, error: "ORGANIZATION_SUSPENDED", status: 403 };
  }

  // If email provided, resolve role
  let role = "VIEWER";
  let user = null;

  if (user_email) {
    const { data: orgUser, error: userError } = await db()
      .from("organization_users")
      .select("id, email, role, status")
      .eq("organization_id", organization_id)
      .eq("email", user_email)
      .single();

    if (userError || !orgUser) {
      return { ok: false, error: "USER_NOT_IN_ORGANIZATION", status: 403 };
    }
    if (orgUser.status !== "ACTIVE") {
      return { ok: false, error: "USER_SUSPENDED", status: 403 };
    }

    role = orgUser.role;
    user = { id: orgUser.id, email: orgUser.email, role };
  }

  return {
    ok:              true,
    mode:            "ENTERPRISE",
    organization_id: org.id,
    organization:    { id: org.id, name: org.name, type: org.type },
    user,
    role,
    permissions:     ROLE_PERMISSIONS[role] || []
  };
}

export function requirePermission(context, action) {
  if (!context.ok) return context;
  if (!roleHasPermission(context.role, action)) {
    return {
      ok:     false,
      error:  "FORBIDDEN",
      reason: `Role '${context.role}' cannot perform '${action}'`,
      status: 403
    };
  }
  return { ok: true };
}
