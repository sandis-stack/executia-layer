import {
  resolveJwtContext,
  requireJwtPermission
} from "../../../../services/jwt-auth.js";

import {
  runGovernanceScheduler
} from "../../../../services/governance-scheduler.js";

function json(res, status, body) {
  return res.status(status).json(body);
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return json(res, 405, {
        ok: false,
        error: {
          code: "METHOD_NOT_ALLOWED"
        }
      });
    }

    const context = await resolveJwtContext(req);

    const permission = requireJwtPermission(
      context,
      "governance.review.approve"
    );

    if (!permission.ok && context?.user?.role !== "OPERATOR") {
      return json(res, 401, {
        ok: false,
        error: {
          code: "INVALID_JWT",
          message: "Governance scheduler permission required."
        }
      });
    }

    const body = req.body || {};
    const scopes = Array.isArray(body.scopes)
      ? body.scopes
      : [
          {
            review_id: body.review_id || null,
            execution_id: body.execution_id || null
          }
        ];

    const result = await runGovernanceScheduler({
      scopes,
      actor: context?.user?.email || "operator@executia.io",
      operator: {
        id: context?.user?.id || null,
        email: context?.user?.email || null,
        role: context?.user?.role || context?.role || null
      },
      materialize_monitor_events: body.materialize_monitor_events === true
    });

    return json(res, 201, {
      ok: true,
      scope: "EXECUTIA_GOVERNANCE_SCHEDULER",
      ...result
    });

  } catch (error) {
    console.error("[EXECUTIA GOVERNANCE SCHEDULER RUN ERROR]", error);

    return json(res, 500, {
      ok: false,
      error: {
        code:
          error.code ||
          "GOVERNANCE_SCHEDULER_RUN_FAILED",
        message:
          error.message ||
          "Governance scheduler run failed."
      }
    });
  }
}
