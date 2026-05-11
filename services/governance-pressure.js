/**
 * EXECUTIA Autonomous Governance Pressure Engine
 * Detects execution saturation, governance stress and overload acceleration.
 */

export function evaluateGovernancePressure({
  runtime = null,
  memory = null,
  prediction = null,
  consensus = null,
  reality = null
} = {}) {

  let pressureIndex = 0;

  const signals = [];

  const recurring =
    memory?.recurring_instability === true;

  const disagreement =
    consensus?.disagreement_detected === true;

  const divergence =
    reality?.divergence_detected === true;

  const predictiveState =
    String(prediction?.predictive_state || "UNKNOWN");

  const integrityState =
    String(reality?.integrity_state || "UNKNOWN");

  const continuity =
    String(runtime?.stability?.continuity || "UNKNOWN");

  const survivability =
    String(runtime?.stability?.survivability || "UNKNOWN");

  if (recurring) {
    pressureIndex += 15;

    signals.push({
      code: "RECURRING_INSTABILITY_PRESSURE",
      severity: "MEDIUM"
    });
  }

  if (disagreement) {
    pressureIndex += 20;

    signals.push({
      code: "CONSENSUS_PRESSURE",
      severity: "MEDIUM"
    });
  }

  if (divergence) {
    pressureIndex += 35;

    signals.push({
      code: "REALITY_DIVERGENCE_PRESSURE",
      severity: "HIGH"
    });
  }

  if (predictiveState.includes("ESCALATION")) {
    pressureIndex += 20;

    signals.push({
      code: "PREDICTIVE_ESCALATION_PRESSURE",
      severity: "HIGH"
    });
  }

  if (predictiveState.includes("LOCKDOWN")) {
    pressureIndex += 45;

    signals.push({
      code: "LOCKDOWN_PRESSURE",
      severity: "CRITICAL"
    });
  }

  if (integrityState.includes("DIVERGENCE")) {
    pressureIndex += 30;

    signals.push({
      code: "EXECUTION_TRUTH_PRESSURE",
      severity: "HIGH"
    });
  }

  if (continuity === "UNSTABLE") {
    pressureIndex += 25;

    signals.push({
      code: "CONTINUITY_PRESSURE",
      severity: "HIGH"
    });
  }

  if (survivability === "DEGRADED") {
    pressureIndex += 20;

    signals.push({
      code: "SURVIVABILITY_PRESSURE",
      severity: "MEDIUM"
    });
  }

  if (pressureIndex > 100)
    pressureIndex = 100;

  const pressureState =
    pressureIndex >= 85
      ? "CRITICAL_PRESSURE"
      : pressureIndex >= 60
      ? "HIGH_PRESSURE"
      : pressureIndex >= 35
      ? "ELEVATED_PRESSURE"
      : "STABLE_PRESSURE";

  const overloadForecast =
    pressureIndex >= 80
      ? "AUTONOMOUS_OVERLOAD_RISK"
      : pressureIndex >= 55
      ? "GOVERNANCE_STRESS_RISK"
      : "NORMAL_RUNTIME_LOAD";

  const saturation =
    pressureIndex >= 75;

  const balancingMode =
    saturation
      ? "PRESSURE_CONTAINMENT"
      : pressureIndex >= 40
      ? "PRESSURE_MONITORING"
      : "BALANCED_RUNTIME";

  return {
    ok: true,
    type: "EXECUTIA_GOVERNANCE_PRESSURE_ENGINE",
    pressure_index: pressureIndex,
    pressure_state: pressureState,
    overload_forecast: overloadForecast,
    saturation_detected: saturation,
    balancing_mode: balancingMode,
    signals,
    summary:
      pressureState === "STABLE_PRESSURE"
        ? "Governance pressure remains stable."
        : `Governance pressure state: ${pressureState}.`
  };
}
