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
          message: "Governance recovery permission required."
        }
      });
    }

    const body = req.body || {};
    const review_id = body.review_id || null;
    const execution_id = body.execution_id || null;
    const recovery_plan = body.recovery_plan || null;

    if (!review_id) {
      return json(res, 400, {
        ok: false,
        error: {
          code: "REVIEW_ID_REQUIRED",
          message: "review_id is required."
        }
      });
    }

    if (!recovery_plan || !recovery_plan.mode) {
      return json(res, 400, {
        ok: false,
        error: {
          code: "RECOVERY_PLAN_REQUIRED",
          message: "Valid recovery_plan is required."
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
        event_type: "GOVERNANCE_AUTONOMOUS_RECOVERY_APPLIED",
        payload: {
          mode: recovery_plan.mode,
          recovery_allowed: recovery_plan.recovery_allowed === true,
          continuity: recovery_plan.continuity || null,
          survivability: recovery_plan.survivability || null,
          containment_mode: recovery_plan.containment_mode || null,
          blockers: recovery_plan.blockers || [],
          conditions: recovery_plan.conditions || [],
          actions: recovery_plan.actions || [],
          summary: recovery_plan.summary || null,
          operator_user_id: context?.user?.id || null,
          operator_email: context?.user?.email || null,
          operator_role: context?.user?.role || context?.role || null
        }
      }
    });

    return json(res, 201, {
      ok: true,
      scope: "EXECUTIA_AUTONOMOUS_RECOVERY_EXECUTOR",
      review_id,
      execution_id,
      recovery_applied: true,
      event
    });
  } catch (error) {
    console.error("[EXECUTIA AUTONOMOUS RECOVERY APPLY ERROR]", error);

    return json(res, 500, {
      ok: false,
      error: {
        code: error.code || "AUTONOMOUS_RECOVERY_APPLY_FAILED",
        message:
          error.message ||
          "Autonomous recovery apply failed."
      }
    });
  }
}
