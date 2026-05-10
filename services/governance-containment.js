/**
 * EXECUTIA Autonomous Governance Containment Engine
 * Converts replay/risk/intelligence/stability state into deterministic containment plan.
 */

export function buildGovernanceContainmentPlan({
  risk = null,
  intelligence = null,
  stability = null,
  verification = null,
  replay = null
} = {}) {
  const actions = [];
  const controls = [];
  const reasons = [];

  const verified = Boolean(verification?.verified);
  const riskLevel = risk?.level || "UNKNOWN";
  const severity = intelligence?.severity || "UNKNOWN";
  const containment = intelligence?.containment || "NONE";
  const continuity = stability?.continuity || "UNKNOWN";
  const collapseProbability = stability?.collapse_probability || "UNKNOWN";
  const stopped = Boolean(replay?.stopped);
  const constitutionTriggered = Boolean(replay?.constitution_triggered);

  if (!verified) {
    actions.push("ACTIVATE_FORENSIC_LOCKDOWN");
    controls.push("BLOCK_APPROVE_REJECT_OVERRIDE");
    reasons.push("Governance chain is not verified.");
  }

  if (constitutionTriggered) {
    actions.push("ENFORCE_TRACE_BEFORE_COMMIT");
    controls.push("BLOCK_COMMIT_WITHOUT_TRACE");
    reasons.push("Constitution runtime breach detected.");
  }

  if (stopped || containment === "FORENSIC_LOCKDOWN") {
    actions.push("MAINTAIN_RUNTIME_FREEZE");
    controls.push("BLOCK_RUNTIME_EXECUTION");
    reasons.push("Runtime containment or forensic lockdown is active.");
  }

  if (riskLevel === "HIGH" || riskLevel === "CRITICAL" || severity === "HIGH" || severity === "CRITICAL") {
    actions.push("ESCALATE_GOVERNANCE_QUORUM");
    controls.push("REQUIRE_SUPERVISOR_QUORUM");
    reasons.push("High governance risk or incident severity detected.");
  }

  if (continuity === "UNSTABLE" || collapseProbability === "HIGH") {
    actions.push("CREATE_STABILIZATION_REVIEW");
    controls.push("REQUIRE_STABILITY_REVIEW_BEFORE_RELEASE");
    reasons.push("Governance continuity is unstable or collapse probability is high.");
  }

  const uniqueActions = [...new Set(actions)];
  const uniqueControls = [...new Set(controls)];
  const uniqueReasons = [...new Set(reasons)];

  const mode =
    uniqueActions.includes("ACTIVATE_FORENSIC_LOCKDOWN")
      ? "FORENSIC_LOCKDOWN"
      : uniqueActions.includes("MAINTAIN_RUNTIME_FREEZE")
      ? "CONTAINMENT_HOLD"
      : uniqueActions.includes("CREATE_STABILIZATION_REVIEW")
      ? "STABILIZATION_REQUIRED"
      : uniqueActions.length
      ? "SUPERVISED_CONTAINMENT"
      : "MONITOR_ONLY";

  const releaseCondition =
    mode === "MONITOR_ONLY"
      ? "NO_RELEASE_REQUIRED"
      : "CHAIN_VERIFIED_AND_SUPERVISOR_QUORUM_AND_STABILITY_REVIEW_CLEARED";

  return {
    ok: true,
    mode,
    autonomous: true,
    execution_allowed: mode === "MONITOR_ONLY",
    release_condition: releaseCondition,
    actions: uniqueActions.length ? uniqueActions : ["CONTINUE_MONITORING"],
    controls: uniqueControls.length ? uniqueControls : ["OBSERVE_ONLY"],
    reasons: uniqueReasons.length ? uniqueReasons : ["No containment trigger detected."],
    summary:
      mode === "MONITOR_ONLY"
        ? "No autonomous containment required."
        : `Autonomous containment mode: ${mode}.`
  };
}
