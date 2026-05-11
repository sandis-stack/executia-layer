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
          message: "Governance watchdog cycle permission required."
        }
      });
    }

    const body = req.body || {};

    const review_id =
      body.review_id ||
      null;

    const execution_id =
      body.execution_id ||
      null;

    if (!review_id && !execution_id) {
      return json(res, 400, {
        ok: false,
        error: {
          code: "RUNTIME_SCOPE_REQUIRED",
          message: "review_id or execution_id is required."
        }
      });
    }

    const runtime = await buildGovernanceRuntime({
      review_id,
      execution_id
    });

    const cycle = runGovernanceWatchdogCycle({
      verification: runtime.verification,
      risk: runtime.risk,
      intelligence: runtime.intelligence,
      stability: runtime.stability,
      containment_plan: runtime.containment_plan,
      recovery_plan: runtime.recovery_plan,
      orchestrator: runtime.orchestrator,
      replay: runtime.replay
    });

    const actor =
      context?.user?.email ||
      "operator@executia.io";

    const event = await insertGovernanceEvent({
      supabase: db(),
      event: {
        review_id,
        execution_id,
        actor,
        event_type: "GOVERNANCE_AUTONOMOUS_RUNTIME_CYCLE",
        payload: {
          autonomous_state: cycle.autonomous_state,
          priority: cycle.priority,
          next_action: cycle.next_action,
          cycle_actions: cycle.cycle_actions,
          escalation: cycle.escalation,
          blockers: cycle.blockers,
          execution_allowed: cycle.execution_allowed,
          survivability: cycle.survivability,
          continuity: cycle.continuity,
          summary: cycle.summary,
          operator_user_id: context?.user?.id || null,
          operator_email: context?.user?.email || null,
          operator_role: context?.user?.role || context?.role || null
        }
      }
    });

    return json(res, 201, {
      ok: true,
      scope: "EXECUTIA_AUTONOMOUS_RUNTIME_CYCLE",
      review_id,
      execution_id,
      runtime,
      cycle,
      event
    });

  } catch (error) {
    console.error(
      "[EXECUTIA AUTONOMOUS RUNTIME CYCLE ERROR]",
      error
    );

    return json(res, 500, {
      ok: false,
      error: {
        code:
          error.code ||
          "AUTONOMOUS_RUNTIME_CYCLE_FAILED",
        message:
          error.message ||
          "Autonomous runtime cycle failed."
      }
    });
  }
}
