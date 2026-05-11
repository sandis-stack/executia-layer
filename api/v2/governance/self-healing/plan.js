import { db } from "../../../../services/db.js";

import {
  resolveJwtContext,
  requireJwtPermission
} from "../../../../services/jwt-auth.js";

import {
  insertGovernanceEvent
} from "../../../../services/governance-hash.js";

import {
  buildGovernanceRuntime
} from "../../../../services/governance-runtime.js";

import {
  runGovernanceWatchdogCycle
} from "../../../../services/governance-watchdog.js";

import {
  planGovernanceSelfHealing
} from "../../../../services/governance-self-healing.js";

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
          message: "Governance self-healing permission required."
        }
      });
    }

    const body = req.body || {};
    const review_id = body.review_id || null;
    const execution_id = body.execution_id || null;

    if (!review_id && !execution_id) {
      return json(res, 400, {
        ok: false,
        error: {
          code: "SELF_HEALING_SCOPE_REQUIRED",
          message: "review_id or execution_id is required."
        }
      });
    }

    const runtime = await buildGovernanceRuntime({
      review_id,
      execution_id
    });

    const watchdog_cycle = runGovernanceWatchdogCycle({
      verification: runtime.verification,
      risk: runtime.risk,
      intelligence: runtime.intelligence,
      stability: runtime.stability,
      containment_plan: runtime.containment_plan,
      recovery_plan: runtime.recovery_plan,
      orchestrator: runtime.orchestrator,
      replay: runtime.replay
    });

    const plan = planGovernanceSelfHealing({
      verification: runtime.verification,
      risk: runtime.risk,
      intelligence: runtime.intelligence,
      stability: runtime.stability,
      containment_plan: runtime.containment_plan,
      recovery_plan: runtime.recovery_plan,
      orchestrator: runtime.orchestrator,
      watchdog_cycle,
      replay: runtime.replay
    });

    const actor = context?.user?.email || "operator@executia.io";

    const event = await insertGovernanceEvent({
      supabase: db(),
      event: {
        review_id,
        execution_id,
        actor,
        event_type: "GOVERNANCE_SELF_HEALING_PLAN",
        payload: {
          healing_state: plan.healing_state,
          priority: plan.priority,
          actions: plan.actions,
          blocked_actions: plan.blocked_actions,
          supervisor_required: plan.supervisor_required,
          autonomous_release_allowed: plan.autonomous_release_allowed,
          containment_mode: plan.containment_mode,
          continuity: plan.continuity,
          survivability: plan.survivability,
          execution_allowed: plan.execution_allowed,
          reasons: plan.reasons,
          summary: plan.summary,
          operator_user_id: context?.user?.id || null,
          operator_email: context?.user?.email || null,
          operator_role: context?.user?.role || context?.role || null
        }
      }
    });

    return json(res, 201, {
      ok: true,
      scope: "EXECUTIA_GOVERNANCE_SELF_HEALING",
      review_id,
      execution_id,
      runtime,
      watchdog_cycle,
      plan,
      event
    });

  } catch (error) {
    console.error("[EXECUTIA GOVERNANCE SELF-HEALING PLAN ERROR]", error);

    return json(res, 500, {
      ok: false,
      error: {
        code:
          error.code ||
          "GOVERNANCE_SELF_HEALING_PLAN_FAILED",
        message:
          error.message ||
          "Governance self-healing plan failed."
      }
    });
  }
}
