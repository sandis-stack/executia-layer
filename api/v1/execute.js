import { createExecution } from "../../services/execution.js";
import { ok, fail } from "../../shared/response.js";
import { resolveJwtContext, requireJwtPermission } from "../../services/jwt-auth.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      return ok(res, {
        engine: "EXECUTIA™",
        status: "ONLINE",
        version: "enterprise-jwt-1.0",
        mode: "ENTERPRISE",
        auth: "Bearer JWT required for execution operations"
      });
    }

    if (req.method === "POST") {
      const context = await resolveJwtContext(req);
      const permission = requireJwtPermission(context, "execute");

      if (!permission.ok) {
        return fail(
          res,
          permission.error || "UNAUTHORIZED",
          permission.reason || "JWT authentication or execute permission required.",
          permission.status || 401
        );
      }

      const body = {
        ...(req.body || {}),
        organization_id: context.organization_id,
        operator_user_id: context.user?.id || null,
        operator_email: context.user?.email || null,
        operator_role: context.user?.role || context.role || null
      };

      const result = await createExecution(body);

      return ok(res, {
        mode: context.mode,
        organization_id: context.organization_id,
        user: context.user,
        result
      }, 201);
    }

    return res.status(405).json({
      ok: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Only GET and POST are allowed."
      },
      allowed: ["GET", "POST"]
    });

  } catch (error) {
    console.error("[EXECUTIA EXECUTE ERROR]", error.message);

    return fail(
      res,
      error.code || "EXECUTION_FAILED",
      error.message || "Execution failed.",
      500
    );
  }
}
