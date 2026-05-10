/**
 * EXECUTIA Autonomous Governance Orchestrator
 * Selects the next deterministic governance action from replay context.
 */

export function orchestrateGovernanceCycle({
  verification = null,
  risk = null,
  intelligence = null,
  stability = null,
  containment_plan = null,
  recovery_plan = null,
  replay = null
} = {}) {
  const decisions = [];
  const reasons = [];

  const verified = Boolean(verification?.verified);
  const riskLevel = risk?.level || "UNKNOWN";
  const severity = intelligence?.severity || "UNKNOWN";
  const continuity = stability?.continuity || "UNKNOWN";
  const collapseProbability = stability?.collapse_probability || "UNKNOWN";
  const containmentMode = containment_plan?.mode || "UNKNOWN";
  const recoveryAllowed = recovery_plan?.recovery_allowed === true;
  const stopped = Boolean(replay?.stopped);

  if (!verified) {
    decisions.push("LOCKDOWN");
    reasons.push("Governance chain is not verified.");
  }

  if (
    containment_plan &&
    containment_plan.execution_allowed === false &&
    containmentMode !== "MONITOR_ONLY"
  ) {
    decisions.push("APPLY_CONTAINMENT");
    reasons.push("Containment plan blocks runtime execution.");
  }

  if (
    stability &&
    (
      continuity === "UNSTABLE" ||
      collapseProbability === "HIGH" ||
      (stability.actions || []).includes("CREATE_STABILIZATION_REVIEW")
    )
  ) {
    decisions.push("CREATE_STABILIZATION_REVIEW");
    reasons.push("Governance stability requires stabilization review.");
  }

  if (
    recovery_plan &&
    !recoveryAllowed &&
    stopped
  ) {
    decisions.push("HOLD_RECOVERY");
    reasons.push("Recovery is not yet authorized.");
  }

  if (
    recovery_plan &&
    recoveryAllowed &&
    verified
  ) {
    decisions.push("APPLY_RECOVERY");
    reasons.push("Recovery plan is authorized and chain is verified.");
  }

  if (
    riskLevel === "HIGH" ||
    riskLevel === "CRITICAL" ||
    severity === "HIGH" ||
    severity === "CRITICAL"
  ) {
    decisions.push("ESCALATE_QUORUM");
    reasons.push("High risk or high severity governance incident detected.");
  }

  const uniqueDecisions = [...new Set(decisions)];
  const uniqueReasons = [...new Set(reasons)];

  const priority =
    uniqueDecisions.includes("LOCKDOWN")
      ? "LOCKDOWN"
      : uniqueDecisions.includes("APPLY_CONTAINMENT")
      ? "APPLY_CONTAINMENT"
      : uniqueDecisions.includes("CREATE_STABILIZATION_REVIEW")
      ? "CREATE_STABILIZATION_REVIEW"
      : uniqueDecisions.includes("HOLD_RECOVERY")
      ? "HOLD_RECOVERY"
      : uniqueDecisions.includes("APPLY_RECOVERY")
      ? "APPLY_RECOVERY"
      : uniqueDecisions.includes("ESCALATE_QUORUM")
      ? "ESCALATE_QUORUM"
      : "MONITOR";

  const autonomous_state =
    priority === "MONITOR"
      ? "STABLE_MONITORING"
      : priority === "HOLD_RECOVERY"
      ? "CONTAINED_RECOVERY_PENDING"
      : priority === "APPLY_RECOVERY"
      ? "RECOVERY_READY"
      : "ACTIVE_GOVERNANCE_CONTROL";

  return {
    ok: true,
    type: "EXECUTIA_AUTONOMOUS_GOVERNANCE_ORCHESTRATION",
    autonomous_state,
    priority,
    decisions: uniqueDecisions.length ? uniqueDecisions : ["MONITOR"],
    reasons: uniqueReasons.length ? uniqueReasons : ["No active governance intervention required."],
    execution_allowed:
      priority === "MONITOR" ||
      priority === "APPLY_RECOVERY",
    next_action: priority,
    summary:
      priority === "MONITOR"
        ? "Governance runtime is stable under monitoring."
        : `Governance orchestrator selected next action: ${priority}.`
  };
}
