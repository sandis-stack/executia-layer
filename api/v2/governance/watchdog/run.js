import { db } from "../../../../services/db.js";

import {
  resolveJwtContext,
  requireJwtPermission
} from "../../../../services/jwt-auth.js";

import {
  insertGovernanceEvent
} from "../../../../services/governance-hash.js";

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
          message: "Governance watchdog permission required."
        }
      });
    }

    const body = req.body || {};
    const review_id = body.review_id || null;
    const execution_id = body.execution_id || null;

    if (!review_id) {
      return json(res, 400, {
        ok: false,
        error: {
          code: "REVIEW_ID_REQUIRED",
          message: "review_id is required."
        }
      });
    }

    const cycle = runGovernanceWatchdogCycle({
      verification: body.verification || null,
      risk: body.risk || null,
      intelligence: body.intelligence || null,
      stability: body.stability || null,
      containment_plan: body.containment_plan || null,
      recovery_plan: body.recovery_plan || null,
      orchestrator: body.orchestrator || null,
      replay: body.replay || null
    });

    const actor = context?.user?.email || "operator@executia.io";

    const event = await insertGovernanceEvent({
      supabase: db(),
      event: {
        review_id,
        execution_id,
        actor,
        event_type: "GOVERNANCE_WATCHDOG_CYCLE",
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
      scope: "EXECUTIA_GOVERNANCE_WATCHDOG_RUNTIME",
      review_id,
      execution_id,
      watchdog_cycle_materialized: true,
      cycle,
      event
    });
  } catch (error) {
    console.error("[EXECUTIA GOVERNANCE WATCHDOG RUN ERROR]", error);

    return json(res, 500, {
      ok: false,
      error: {
        code: error.code || "GOVERNANCE_WATCHDOG_RUN_FAILED",
        message:
          error.message ||
          "Governance watchdog run failed."
      }
    });
  }
}
