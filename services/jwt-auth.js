/**
 * EXECUTIA JWT Auth — Supabase operator session verification.
 *
 * Supabase issues JWT tokens on login (operator@executia.io → password).
 * We verify them via supabase.auth.getUser(token) — no secret needed client-side.
 *
 * Role/permission matrix:
 *   ADMIN      → execute, approve, block, audit, settle, manage_users, view
 *   OPERATOR   → execute, approve, block, view
 *   AUDITOR    → audit, view
 *   REGULATOR  → audit, view
 *   VIEWER     → view
 */
import { createClient } from "@supabase/supabase-js";

const ROLE_PERMISSIONS = {
  ADMIN:     ["execute","approve","block","audit","settle","manage_users","view"],
  OPERATOR:  ["execute","approve","block","view"],
  AUDITOR:   ["audit","view"],
  REGULATOR: ["audit","view"],
  VIEWER:    ["view"]
};

function getAuthClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_ENV_MISSING");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function extractBearer(req) {
  const auth = req.headers["authorization"] || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7).trim();
  return null;
}

export async function resolveJwtContext(req) {
  const token = extractBearer(req);
  if (!token) return { ok: false, error: "NO_BEARER_TOKEN", status: 401 };

  try {
    const supabase = getAuthClient();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return { ok: false, error: "INVALID_JWT", status: 401 };
    }

    const user = data.user;
    const meta = user.user_metadata || {};
    const role = (meta.role || meta.executia_role || "OPERATOR").toUpperCase();
    const org  = meta.organization_id || user.app_metadata?.organization_id || null;

    return {
      ok:              true,
      mode:            "SUPABASE_JWT",
      user:            { id: user.id, email: user.email, role },
      role,
      organization_id: org,
      permissions:     ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.VIEWER
    };

  } catch (err) {
    return { ok: false, error: err.message || "JWT_VERIFY_FAILED", status: 500 };
  }
}

export function requireJwtPermission(context, action) {
  if (!context.ok) return { ok: false, ...context };
  const perms = context.permissions || [];
  if (!perms.includes(action)) {
    return {
      ok:     false,
      error:  "FORBIDDEN",
      reason: `Role '${context.role}' cannot perform '${action}'`,
      status: 403
    };
  }
  return { ok: true };
}
