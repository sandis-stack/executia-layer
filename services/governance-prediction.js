/**
 * EXECUTIA Predictive Governance Intelligence
 * Predictive governance drift / collapse forecasting.
 */

export function predictGovernanceState({
  memory = null,
  risk = null,
  intelligence = null,
  stability = null,
  recovery_plan = null,
  containment_plan = null,
  orchestrator = null
} = {}) {

  const signals = [];

  let score = 0;

  const recurring =
    memory?.recurring_instability === true;

  const riskLevel =
    String(risk?.level || "LOW").toUpperCase();

  const continuity =
    String(stability?.continuity || "UNKNOWN").toUpperCase();

  const survivability =
    String(stability?.survivability || "UNKNOWN").toUpperCase();

  const containment =
    String(containment_plan?.mode || "UNKNOWN").toUpperCase();

  const recovery =
    String(recovery_plan?.mode || "UNKNOWN").toUpperCase();

  const autonomousState =
    String(orchestrator?.autonomous_state || "UNKNOWN").toUpperCase();

  if (recurring) {
    score += 25;

    signals.push({
      code: "RECURRING_INSTABILITY",
      severity: "MEDIUM"
    });
  }

  if (riskLevel === "HIGH") {
    score += 35;

    signals.push({
      code: "HIGH_RISK_RUNTIME",
      severity: "HIGH"
    });
  }

  if (riskLevel === "CRITICAL") {
    score += 60;

    signals.push({
      code: "CRITICAL_RISK_RUNTIME",
      severity: "CRITICAL"
    });
  }

  if (continuity === "UNSTABLE") {
    score += 30;

    signals.push({
      code: "CONTINUITY_UNSTABLE",
      severity: "HIGH"
    });
  }

  if (survivability === "DEGRADED") {
    score += 20;

    signals.push({
      code: "SURVIVABILITY_DEGRADED",
      severity: "MEDIUM"
    });
  }

  if (
    containment.includes("LOCKDOWN") ||
    containment.includes("FREEZE")
  ) {
    score += 25;

    signals.push({
      code: "CONTAINMENT_ESCALATION",
      severity: "HIGH"
    });
  }

  if (
    autonomousState.includes("FAIL") ||
    autonomousState.includes("COLLAPSE")
  ) {
    score += 40;

    signals.push({
      code: "AUTONOMOUS_COLLAPSE_PATTERN",
      severity: "CRITICAL"
    });
  }

  const collapseProbability =
    score >= 80
      ? "CRITICAL"
      : score >= 55
      ? "HIGH"
      : score >= 30
      ? "MEDIUM"
      : "LOW";

  const escalationForecast =
    score >= 70
      ? "AUTONOMOUS_ESCALATION_REQUIRED"
      : score >= 40
      ? "SUPERVISOR_REVIEW_LIKELY"
      : "STABLE_RUNTIME_EXPECTED";

  const survivabilityForecast =
    score >= 80
      ? "SURVIVABILITY_AT_RISK"
      : score >= 50
      ? "DEGRADED_SURVIVABILITY"
      : "STABLE_SURVIVABILITY";

  const anomalyPrediction =
    signals.length >= 4
      ? "MULTI_SIGNAL_GOVERNANCE_ANOMALY"
      : signals.length >= 2
      ? "EARLY_GOVERNANCE_DRIFT"
      : "NO_SIGNIFICANT_ANOMALY";

  const predictiveState =
    score >= 80
      ? "PREDICTIVE_LOCKDOWN"
      : score >= 55
      ? "PREDICTIVE_ESCALATION"
      : score >= 30
      ? "PREDICTIVE_WATCH"
      : "PREDICTIVE_STABLE";

  return {
    ok: true,
    type: "EXECUTIA_PREDICTIVE_GOVERNANCE_INTELLIGENCE",
    predictive_state: predictiveState,
    governance_score: score,
    collapse_probability: collapseProbability,
    escalation_forecast: escalationForecast,
    survivability_forecast: survivabilityForecast,
    anomaly_prediction: anomalyPrediction,
    recovery_mode: recovery,
    containment_mode: containment,
    autonomous_state: autonomousState,
    recurring_instability: recurring,
    signals,
    summary:
      predictiveState === "PREDICTIVE_STABLE"
        ? "Predictive governance intelligence indicates stable runtime."
        : `Predictive governance state: ${predictiveState}.`
  };
}
