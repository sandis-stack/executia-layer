import { verifyJwt } from "./jwt.js";

export async function resolveJwtContext(req) {
  try {
    const authHeader = req.headers["authorization"] || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return {
        ok: false,
        error: "JWT_REQUIRED",
        status: 401
      };
    }

    const verified = verifyJwt(token);

    if (!verified.ok) {
      return {
        ok: false,
        error: verified.error || "JWT_INVALID",
        status: 401
      };
    }

    const payload = verified.payload || {};

    return {
      ok: true,
      mode: payload.mode || "ENTERPRISE",
      organization_id: payload.organization_id || null,
      role: payload.role || "VIEWER",
      permissions: payload.permissions || [],
      user: payload.user || null,
      token_payload: payload
    };

  } catch (err) {
    return {
      ok: false,
      error: err.message || "JWT_AUTH_FAILED",
      status: 401
    };
  }
}

export function requireJwtPermission(context, permission) {
  if (!context?.ok) {
    return {
      ok: false,
      error: "UNAUTHORIZED",
      status: 401
    };
  }

  const perms = context.permissions || [];

  if (!perms.includes(permission)) {
    return {
      ok: false,
      error: "FORBIDDEN",
      reason: `Missing permission: ${permission}`,
      status: 403
    };
  }

  return { ok: true };
}
