import { db } from "../../../../services/db.js";

import {
  resolveJwtContext,
  requireJwtPermission
} from "../../../../services/jwt-auth.js";

import {
  insertGovernanceEvent
} from "../../../../services/governance-hash.js";

function json(res, status, body) {
  return res.status(status).json(body);
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return json(res, 405, {
        ok: false,
        error: { code: "METHOD_NOT_ALLOWED" }
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
          message: "Governance orchestrator permission required."
        }
      });
    }

    const body = req.body || {};
    const review_id = body.review_id || null;
    const execution_id = body.execution_id || null;
    const orchestrator = body.orchestrator || null;

    if (!review_id) {
      return json(res, 400, {
        ok: false,
        error: {
          code: "REVIEW_ID_REQUIRED",
          message: "review_id is required."
        }
      });
    }

    if (!orchestrator || !orchestrator.next_action) {
      return json(res, 400, {
        ok: false,
        error: {
          code: "ORCHESTRATOR_DECISION_REQUIRED",
          message: "Valid orchestrator decision is required."
        }
      });
    }

    const actor = context?.user?.email || "operator@executia.io";

    const event = await insertGovernanceEvent({
      supabase: db(),
      event: {
        review_id,
        execution_id,
        actor,
        event_type: "GOVERNANCE_ORCHESTRATOR_DECISION",
        payload: {
          autonomous_state: orchestrator.autonomous_state || null,
          priority: orchestrator.priority || null,
          next_action: orchestrator.next_action || null,
          execution_allowed: orchestrator.execution_allowed === true,
          decisions: orchestrator.decisions || [],
          reasons: orchestrator.reasons || [],
          summary: orchestrator.summary || null,
          operator_user_id: context?.user?.id || null,
          operator_email: context?.user?.email || null,
          operator_role: context?.user?.role || context?.role || null
        }
      }
    });

    return json(res, 201, {
      ok: true,
      scope: "EXECUTIA_AUTONOMOUS_GOVERNANCE_ORCHESTRATOR",
      review_id,
      execution_id,
      orchestrator_materialized: true,
      next_action: orchestrator.next_action,
      event
    });
  } catch (error) {
    console.error("[EXECUTIA GOVERNANCE ORCHESTRATOR RUN ERROR]", error);

    return json(res, 500, {
      ok: false,
      error: {
        code: error.code || "GOVERNANCE_ORCHESTRATOR_RUN_FAILED",
        message:
          error.message ||
          "Governance orchestrator run failed."
      }
    });
  }
}
