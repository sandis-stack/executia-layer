/**
 * EXECUTIA Governance Self-Healing Planner
 * Produces deterministic corrective actions from runtime state.
 *
 * This planner does NOT directly release freezes or bypass quorum.
 * It creates a safe autonomous healing plan for materialization/review.
 */

export function planGovernanceSelfHealing({
  verification = null,
  risk = null,
  intelligence = null,
  stability = null,
  containment_plan = null,
  recovery_plan = null,
  orchestrator = null,
  watchdog_cycle = null,
  replay = null
} = {}) {
  const actions = [];
  const blocked_actions = [];
  const supervisor_required = [];
  const reasons = [];

  const verified = verification?.verified === true;
  const continuity = stability?.continuity || "UNKNOWN";
  const collapseProbability = stability?.collapse_probability || "UNKNOWN";
  const containmentMode = containment_plan?.mode || "UNKNOWN";
  const recoveryAllowed = recovery_plan?.recovery_allowed === true;
  const priority =
    watchdog_cycle?.priority ||
    orchestrator?.priority ||
    "MONITOR";

  if (!verified) {
    actions.push("LOCKDOWN_RUNTIME");
    blocked_actions.push("AUTO_RECOVERY");
    supervisor_required.push("HASH_CHAIN_REPAIR_REVIEW");
    reasons.push("Governance hash-chain is not verified.");
  }

  if (
    containment_plan?.execution_allowed === false ||
    priority === "APPLY_CONTAINMENT" ||
    watchdog_cycle?.cycle_actions?.includes("APPLY_CONTAINMENT")
  ) {
    actions.push("MAINTAIN_OR_APPLY_CONTAINMENT");
    supervisor_required.push("CONTAINMENT_REVIEW");
    reasons.push("Runtime containment is required before execution can continue.");
  }

  if (
    continuity === "UNSTABLE" ||
    collapseProbability === "HIGH" ||
    watchdog_cycle?.cycle_actions?.includes("CREATE_STABILIZATION_REVIEW")
  ) {
    actions.push("CREATE_STABILIZATION_REVIEW");
    supervisor_required.push("STABILITY_REVIEW");
    reasons.push("Governance stability requires formal stabilization review.");
  }

  if (
    risk?.level === "HIGH" ||
    risk?.level === "CRITICAL" ||
    intelligence?.severity === "HIGH" ||
    intelligence?.severity === "CRITICAL" ||
    watchdog_cycle?.cycle_actions?.includes("ESCALATE_QUORUM")
  ) {
    actions.push("ESCALATE_QUORUM");
    supervisor_required.push("SUPERVISOR_QUORUM");
    reasons.push("High governance risk requires quorum escalation.");
  }

  if (recoveryAllowed && verified) {
    actions.push("PREPARE_SUPERVISED_RECOVERY");
    supervisor_required.push("SUPERVISOR_RELEASE_DECISION");
    reasons.push("Recovery is technically ready but release remains supervisor-controlled.");
  }

  if (
    recovery_plan &&
    recovery_plan.recovery_allowed === false
  ) {
    blocked_actions.push("AUTO_RELEASE");
    reasons.push("Recovery is not authorized by runtime recovery plan.");
  }

  if (!actions.length) {
    actions.push("CONTINUE_MONITORING");
    reasons.push("No self-healing intervention required.");
  }

  const uniqueActions = [...new Set(actions)];
  const uniqueBlocked = [...new Set(blocked_actions)];
  const uniqueSupervisor = [...new Set(supervisor_required)];
  const uniqueReasons = [...new Set(reasons)];

  const healing_state =
    uniqueActions.includes("LOCKDOWN_RUNTIME")
      ? "SELF_HEALING_LOCKDOWN_REQUIRED"
      : uniqueActions.includes("MAINTAIN_OR_APPLY_CONTAINMENT")
      ? "SELF_HEALING_CONTAINMENT_REQUIRED"
      : uniqueActions.includes("CREATE_STABILIZATION_REVIEW")
      ? "SELF_HEALING_STABILIZATION_REQUIRED"
      : uniqueActions.includes("PREPARE_SUPERVISED_RECOVERY")
      ? "SELF_HEALING_RECOVERY_READY"
      : "SELF_HEALING_MONITORING";

  return {
    ok: true,
    type: "EXECUTIA_GOVERNANCE_SELF_HEALING_PLAN",
    healing_state,
    priority,
    actions: uniqueActions,
    blocked_actions: uniqueBlocked,
    supervisor_required: uniqueSupervisor,
    autonomous_release_allowed: false,
    containment_mode: containmentMode,
    continuity,
    survivability: stability?.survivability || "UNKNOWN",
    execution_allowed:
      verified &&
      containment_plan?.execution_allowed !== false &&
      !uniqueActions.includes("LOCKDOWN_RUNTIME"),
    reasons: uniqueReasons,
    summary:
      healing_state === "SELF_HEALING_MONITORING"
        ? "Self-healing planner found no intervention required."
        : `Self-healing planner selected state: ${healing_state}.`
  };
}
