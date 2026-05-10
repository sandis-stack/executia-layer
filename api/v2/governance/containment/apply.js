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
          message: "Governance containment permission required."
        }
      });
    }

    const body = req.body || {};
    const review_id = body.review_id || null;
    const execution_id = body.execution_id || null;
    const containment_plan = body.containment_plan || null;

    if (!review_id) {
      return json(res, 400, {
        ok: false,
        error: {
          code: "REVIEW_ID_REQUIRED",
          message: "review_id is required."
        }
      });
    }

    if (!containment_plan || !containment_plan.mode) {
      return json(res, 400, {
        ok: false,
        error: {
          code: "CONTAINMENT_PLAN_REQUIRED",
          message: "Valid containment_plan is required."
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
        event_type: "GOVERNANCE_AUTONOMOUS_CONTAINMENT_APPLIED",
        payload: {
          mode: containment_plan.mode,
          autonomous: containment_plan.autonomous === true,
          execution_allowed: containment_plan.execution_allowed === true,
          release_condition: containment_plan.release_condition || null,
          actions: containment_plan.actions || [],
          controls: containment_plan.controls || [],
          reasons: containment_plan.reasons || [],
          summary: containment_plan.summary || null,
          operator_user_id: context?.user?.id || null,
          operator_email: context?.user?.email || null,
          operator_role: context?.user?.role || context?.role || null
        }
      }
    });

    return json(res, 201, {
      ok: true,
      scope: "EXECUTIA_AUTONOMOUS_CONTAINMENT_EXECUTOR",
      review_id,
      execution_id,
      containment_applied: true,
      event
    });
  } catch (error) {
    console.error("[EXECUTIA AUTONOMOUS CONTAINMENT APPLY ERROR]", error);

    return json(res, 500, {
      ok: false,
      error: {
        code: error.code || "AUTONOMOUS_CONTAINMENT_APPLY_FAILED",
        message:
          error.message ||
          "Autonomous containment apply failed."
      }
    });
  }
}
