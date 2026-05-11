/**
 * EXECUTIA Governance Watchdog
 * Deterministic autonomous execution-cycle supervisor.
 */

export function runGovernanceWatchdogCycle({
  verification = null,
  risk = null,
  intelligence = null,
  stability = null,
  containment_plan = null,
  recovery_plan = null,
  orchestrator = null,
  replay = null
} = {}) {
  const cycle_actions = [];
  const escalation = [];
  const blockers = [];

  const verified = verification?.verified === true;
  const priority = orchestrator?.priority || "MONITOR";
  const nextAction = orchestrator?.next_action || priority;
  const decisions = Array.isArray(orchestrator?.decisions)
    ? orchestrator.decisions
    : [];

  const containmentRequired =
    decisions.includes("APPLY_CONTAINMENT") ||
    nextAction === "APPLY_CONTAINMENT" ||
    containment_plan?.execution_allowed === false;

  const stabilizationRequired =
    decisions.includes("CREATE_STABILIZATION_REVIEW") ||
    nextAction === "CREATE_STABILIZATION_REVIEW" ||
    stability?.continuity === "UNSTABLE" ||
    stability?.collapse_probability === "HIGH";

  const recoveryHeld =
    decisions.includes("HOLD_RECOVERY") ||
    nextAction === "HOLD_RECOVERY" ||
    recovery_plan?.recovery_allowed === false;

  const recoveryReady =
    decisions.includes("APPLY_RECOVERY") ||
    nextAction === "APPLY_RECOVERY" ||
    recovery_plan?.recovery_allowed === true;

  if (!verified) {
    cycle_actions.push("LOCKDOWN_RUNTIME");
    escalation.push("HASH_CHAIN_VERIFICATION_FAILED");
    blockers.push("GOVERNANCE_CHAIN_UNVERIFIED");
  }

  if (containmentRequired) {
    cycle_actions.push("APPLY_CONTAINMENT");
  }

  if (stabilizationRequired) {
    cycle_actions.push("CREATE_STABILIZATION_REVIEW");
  }

  if (recoveryHeld) {
    cycle_actions.push("HOLD_RECOVERY");
    blockers.push("RECOVERY_NOT_AUTHORIZED");
  }

  if (recoveryReady && verified) {
    cycle_actions.push("APPLY_RECOVERY");
  }

  if (
    risk?.level === "HIGH" ||
    risk?.level === "CRITICAL" ||
    intelligence?.severity === "HIGH" ||
    intelligence?.severity === "CRITICAL" ||
    decisions.includes("ESCALATE_QUORUM")
  ) {
    cycle_actions.push("ESCALATE_QUORUM");
    escalation.push("HIGH_GOVERNANCE_RISK");
  }

  if (!cycle_actions.length) {
    cycle_actions.push("MONITOR");
  }

  const uniqueActions = [...new Set(cycle_actions)];
  const uniqueEscalation = [...new Set(escalation)];
  const uniqueBlockers = [...new Set(blockers)];

  const autonomous_state =
    uniqueActions.includes("LOCKDOWN_RUNTIME")
      ? "WATCHDOG_LOCKDOWN"
      : uniqueActions.includes("APPLY_CONTAINMENT")
      ? "WATCHDOG_CONTAINMENT_ACTIVE"
      : uniqueActions.includes("HOLD_RECOVERY")
      ? "WATCHDOG_RECOVERY_HELD"
      : uniqueActions.includes("APPLY_RECOVERY")
      ? "WATCHDOG_RECOVERY_READY"
      : "WATCHDOG_MONITORING";

  return {
    ok: true,
    type: "EXECUTIA_GOVERNANCE_WATCHDOG_CYCLE",
    autonomous_state,
    priority,
    next_action: nextAction,
    cycle_actions: uniqueActions,
    escalation: uniqueEscalation,
    blockers: uniqueBlockers,
    execution_allowed:
      verified &&
      !uniqueActions.includes("LOCKDOWN_RUNTIME") &&
      !uniqueActions.includes("APPLY_CONTAINMENT"),
    survivability: stability?.survivability || "UNKNOWN",
    continuity: stability?.continuity || "UNKNOWN",
    summary:
      uniqueActions.includes("MONITOR")
        ? "Watchdog cycle completed under monitoring state."
        : `Watchdog cycle selected actions: ${uniqueActions.join(", ")}.`
  };
}
