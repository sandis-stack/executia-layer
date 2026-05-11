import { db } from "./db.js";

import {
  insertGovernanceEvent
} from "./governance-hash.js";

import {
  buildGovernanceRuntime
} from "./governance-runtime.js";

import {
  runGovernanceWatchdogCycle
} from "./governance-watchdog.js";

/**
 * EXECUTIA Governance Scheduler
 * One-shot autonomous runtime loop runner.
 *
 * This does NOT create an infinite process.
 * It executes deterministic cycles for provided runtime scopes.
 */
export async function runGovernanceScheduler({
  scopes = [],
  actor = "scheduler@executia.io",
  operator = null,
  materialize_monitor_events = false
} = {}) {
  const supabase = db();

  const normalizedScopes = (Array.isArray(scopes) ? scopes : [])
    .map((scope) => ({
      review_id: scope?.review_id || null,
      execution_id: scope?.execution_id || null
    }))
    .filter((scope) => scope.review_id || scope.execution_id);

  if (!normalizedScopes.length) {
    const err = new Error("SCHEDULER_SCOPES_REQUIRED");
    err.code = "SCHEDULER_SCOPES_REQUIRED";
    throw err;
  }

  const results = [];

  for (const scope of normalizedScopes) {
    const runtime = await buildGovernanceRuntime(scope);

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

    const shouldMaterialize =
      materialize_monitor_events === true ||
      !cycle.cycle_actions.includes("MONITOR");

    let event = null;

    if (shouldMaterialize) {
      event = await insertGovernanceEvent({
        supabase,
        event: {
          review_id: scope.review_id,
          execution_id: scope.execution_id,
          actor,
          event_type: "GOVERNANCE_SCHEDULER_CYCLE",
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
            scheduler_mode: "ONE_SHOT_AUTONOMOUS_RUNTIME_LOOP",
            materialize_monitor_events,
            operator_user_id: operator?.id || null,
            operator_email: operator?.email || null,
            operator_role: operator?.role || null
          }
        }
      });
    }

    results.push({
      ok: true,
      review_id: scope.review_id,
      execution_id: scope.execution_id,
      materialized: Boolean(event),
      cycle,
      event
    });
  }

  return {
    ok: true,
    type: "EXECUTIA_GOVERNANCE_SCHEDULER_RUN",
    mode: "ONE_SHOT_AUTONOMOUS_RUNTIME_LOOP",
    cycles_requested: normalizedScopes.length,
    cycles_completed: results.length,
    materialized_events: results.filter((item) => item.materialized).length,
    results
  };
}
