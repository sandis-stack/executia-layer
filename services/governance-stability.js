/**
 * EXECUTIA Governance Stability Engine
 * Predicts governance continuity, overload, collapse probability and stabilization actions.
 */

export function assessGovernanceStability({ risk = null, intelligence = null, verification = null, replay = null } = {}) {
  const signals = [];
  let score = 100;

  const riskLevel = risk?.level || "UNKNOWN";
  const incident = intelligence?.incident || "UNKNOWN";
  const severity = intelligence?.severity || "UNKNOWN";
  const containment = intelligence?.containment || "NONE";
  const survivability = intelligence?.survivability || "UNKNOWN";
  const verified = Boolean(verification?.verified);
  const stopped = Boolean(replay?.stopped);
  const constitutionTriggered = Boolean(replay?.constitution_triggered);
  const eventCount = Number(replay?.event_count || 0);

  if (!verified) {
    score -= 35;
    signals.push({
      code: "CHAIN_UNVERIFIED",
      severity: "CRITICAL",
      message: "Governance chain verification failed or unavailable."
    });
  }

  if (riskLevel === "CRITICAL") {
    score -= 30;
    signals.push({
      code: "CRITICAL_RISK_PRESSURE",
      severity: "CRITICAL",
      message: "Critical governance risk pressure detected."
    });
  } else if (riskLevel === "HIGH") {
    score -= 20;
    signals.push({
      code: "HIGH_RISK_PRESSURE",
      severity: "HIGH",
      message: "High governance risk pressure detected."
    });
  }

  if (severity === "CRITICAL") {
    score -= 25;
    signals.push({
      code: "CRITICAL_INCIDENT_SEVERITY",
      severity: "CRITICAL",
      message: "Autonomous intelligence classified the incident as critical."
    });
  } else if (severity === "HIGH") {
    score -= 15;
    signals.push({
      code: "HIGH_INCIDENT_SEVERITY",
      severity: "HIGH",
      message: "Autonomous intelligence classified the incident as high severity."
    });
  }

  if (constitutionTriggered) {
    score -= 15;
    signals.push({
      code: "CONSTITUTION_STRESS",
      severity: "HIGH",
      message: "Constitution runtime was triggered during replay."
    });
  }

  if (stopped) {
    score -= 15;
    signals.push({
      code: "EXECUTION_STOPPED",
      severity: "HIGH",
      message: "Execution was stopped or contained by governance runtime."
    });
  }

  if (containment === "FORENSIC_LOCKDOWN") {
    score -= 10;
    signals.push({
      code: "FORENSIC_LOCKDOWN_ACTIVE",
      severity: "HIGH",
      message: "Forensic lockdown containment is recommended or active."
    });
  }

  if (survivability === "DEGRADED") {
    score -= 10;
    signals.push({
      code: "SURVIVABILITY_DEGRADED",
      severity: "HIGH",
      message: "System survivability is degraded under current governance stress."
    });
  }

  if (eventCount >= 25) {
    score -= 10;
    signals.push({
      code: "EVENT_DENSITY_PRESSURE",
      severity: "MEDIUM",
      message: "Governance event density indicates operational pressure."
    });
  }

  score = Math.max(0, Math.min(100, score));

  const collapseProbability =
    score <= 25 ? "HIGH" :
    score <= 50 ? "MEDIUM" :
    score <= 75 ? "LOW" :
    "MINIMAL";

  const continuity =
    score >= 80 ? "STABLE" :
    score >= 60 ? "WATCH" :
    score >= 40 ? "DEGRADED" :
    "UNSTABLE";

  const quorumFailureRisk =
    riskLevel === "CRITICAL" || severity === "CRITICAL" ? "HIGH" :
    riskLevel === "HIGH" || severity === "HIGH" ? "MEDIUM" :
    "LOW";

  const overload =
    eventCount >= 50 ? "HIGH" :
    eventCount >= 25 ? "MEDIUM" :
    "LOW";

  const actions = [];

  if (!verified) actions.push("LOCK_CHAIN_AND_REQUIRE_FORENSIC_REVIEW");
  if (constitutionTriggered) actions.push("REQUIRE_TRACE_BEFORE_COMMIT");
  if (stopped) actions.push("MAINTAIN_CONTAINMENT_UNTIL_SUPERVISOR_RELEASE");
  if (quorumFailureRisk !== "LOW") actions.push("ESCALATE_TO_FULL_GOVERNANCE_QUORUM");
  if (collapseProbability !== "MINIMAL") actions.push("CREATE_STABILIZATION_REVIEW");

  if (!actions.length) actions.push("CONTINUE_MONITORING");

  return {
    ok: true,
    score,
    continuity,
    collapse_probability: collapseProbability,
    quorum_failure_risk: quorumFailureRisk,
    overload,
    survivability,
    incident,
    containment,
    actions,
    signals,
    summary: `Governance continuity is ${continuity}; collapse probability is ${collapseProbability}.`
  };
}
