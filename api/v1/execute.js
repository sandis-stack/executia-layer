import { createExecution } from "../../services/execution.js";
import { ok, fail } from "../../shared/response.js";
import { resolveJwtContext, requireJwtPermission } from "../../services/jwt-auth.js";
import { assertExecutionNotFrozen } from "../../services/governance-freeze.js";
import { assertCommitHasTrace } from "../../services/governance-constitution.js";
import { materializeConstitutionEvent } from "../../services/governance-constitution-events.js";

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

      const requestBody = req.body || {};

      await assertExecutionNotFrozen({
        organization_id: context.organization_id,
        review_id: requestBody.review_id || null,
        execution_id: requestBody.execution_id || null,
        actor: context.user,
        metadata: {
          request_type: requestBody.type || null,
          operator_role: context.user?.role || context.role || null
        }
      });

      const trace_id =
        requestBody.trace_id ||
        requestBody.trace?.id ||
        requestBody.execution_trace_id ||
        null;

      const commitRule = assertCommitHasTrace({
        trace_id,
        execution_id: requestBody.execution_id || null
      });

      if (commitRule?.event) {
        await materializeConstitutionEvent({
          type: commitRule.event.type,
          rule: commitRule.event.rule,
          reason: commitRule.event.reason || null,
          context: commitRule.event.context || {},
          actor: context.user
        });
      }

      if (!commitRule.ok) {
        return res.status(409).json(commitRule);
      }

      const body = {
        ...requestBody,
        trace_id,
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

    if (error.code === "EXECUTION_FROZEN") {
      return res.status(423).json({
        ok: false,
        error: {
          code: "EXECUTION_FROZEN",
          message: "Execution blocked by active governance freeze.",
          freeze: error.freeze || null
        }
      });
    }

    return fail(
      res,
      error.code || "EXECUTION_FAILED",
      error.message || "Execution failed.",
      500
    );
  }
}
