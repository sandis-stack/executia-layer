import { resolveJwtContext } from "../../../services/jwt-auth.js";

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload, null, 2));
}

export default async function handler(req, res) {
  try {
    const context = await resolveJwtContext(req);

    return json(res, context.ok ? 200 : context.status || 500, {
      ok: context.ok,
      mode: context.mode || null,
      error: context.error || null,
      status: context.status || null,
      role: context.role || null,
      organization_id: context.organization_id || null,
      user: context.user || null,
      permissions: context.permissions || []
    });
  } catch (error) {
    return json(res, 500, {
      ok: false,
      error: error.code || "AUTH_DEBUG_FAILED",
      message: error.message
    });
  }
}
