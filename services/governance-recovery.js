/**
 * EXECUTIA Autonomous Governance Recovery Engine
 * Determines deterministic recovery and re-entry path after containment.
 */

export function buildGovernanceRecoveryPlan({
  verification = null,
  risk = null,
  intelligence = null,
  stability = null,
  containment_plan = null,
  replay = null
} = {}) {

  const actions = [];
  const conditions = [];
  const blockers = [];

  const verified = Boolean(verification?.verified);
  const stopped = Boolean(replay?.stopped);

  const riskLevel = risk?.level || "UNKNOWN";
  const continuity = stability?.continuity || "UNKNOWN";
  const survivability = stability?.survivability || "UNKNOWN";

  const containmentMode =
    containment_plan?.mode || "UNKNOWN";

  if (!verified) {
    blockers.push("CHAIN_NOT_VERIFIED");
  }

  if (riskLevel === "CRITICAL") {
    blockers.push("CRITICAL_RISK_ACTIVE");
  }

  if (continuity === "UNSTABLE") {
    blockers.push("CONTINUITY_UNSTABLE");
  }

  if (survivability === "FAILED") {
    blockers.push("SYSTEM_SURVIVABILITY_FAILED");
  }

  if (containmentMode === "FORENSIC_LOCKDOWN") {
    blockers.push("FORENSIC_LOCKDOWN_ACTIVE");
  }

  if (stopped) {
    conditions.push("SUPERVISOR_RELEASE_REQUIRED");
    conditions.push("STABILITY_REVIEW_REQUIRED");
  }

  if (verified) {
    actions.push("VERIFY_CHAIN_CONTINUITY");
  }

  if (continuity !== "UNSTABLE") {
    actions.push("RESTORE_EXECUTION_CONTINUITY");
  }

  if (riskLevel !== "CRITICAL") {
    actions.push("ALLOW_SUPERVISED_REENTRY");
  }

  if (
    blockers.length === 0 &&
    verified &&
    continuity !== "UNSTABLE"
  ) {
    actions.push("AUTHORIZE_RUNTIME_RECOVERY");
  }

  const recovery_allowed =
    blockers.length === 0 &&
    verified &&
    continuity !== "UNSTABLE";

  const mode =
    recovery_allowed
      ? "RECOVERY_READY"
      : blockers.length >= 3
      ? "RECOVERY_BLOCKED"
      : "RECOVERY_SUPERVISED";

  return {
    ok: true,
    mode,
    recovery_allowed,
    continuity: continuity || "UNKNOWN",
    survivability: survivability || "UNKNOWN",
    containment_mode: containmentMode,
    blockers,
    conditions,
    actions,
    summary:
      recovery_allowed
        ? "Governance runtime recovery authorized."
        : "Governance runtime recovery still restricted."
  };
}
