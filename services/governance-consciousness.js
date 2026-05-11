/**
 * EXECUTIA Governance Consciousness Engine
 * Runtime self-awareness, anomaly cognition and execution observation layer.
 */

export function evaluateGovernanceConsciousness({
  runtime = null,
  reality = null,
  pressure = null,
  gravity = null,
  time = null,
  prediction = null,
  consensus = null
} = {}) {

  let awarenessIndex = 100;

  const signals = [];
  const observations = [];

  const divergence =
    reality?.divergence_detected === true;

  const pressureIndex =
    Number(pressure?.pressure_index || 0);

  const gravityIndex =
    Number(gravity?.gravity_index || 0);

  const temporalIndex =
    Number(time?.temporal_index || 0);

  const disagreement =
    consensus?.disagreement_detected === true;

  const predictiveState =
    String(prediction?.predictive_state || "UNKNOWN");

  const survivability =
    String(runtime?.stability?.survivability || "UNKNOWN");

  if (divergence) {

    awarenessIndex -= 25;

    observations.push(
      "EXECUTION_REALITY_DIVERGENCE"
    );

    signals.push({
      code: "REALITY_COGNITION_ALERT",
      severity: "CRITICAL"
    });
  }

  if (pressureIndex >= 60) {

    awarenessIndex -= 15;

    observations.push(
      "PRESSURE_FIELD_ELEVATION"
    );

    signals.push({
      code: "PRESSURE_AWARENESS_TRIGGER",
      severity: "HIGH"
    });
  }

  if (gravityIndex >= 70) {

    awarenessIndex -= 20;

    observations.push(
      "GRAVITY_COLLAPSE_VECTOR"
    );

    signals.push({
      code: "GRAVITY_COGNITION_EVENT",
      severity: "HIGH"
    });
  }

  if (temporalIndex >= 60) {

    awarenessIndex -= 15;

    observations.push(
      "TEMPORAL_DRIFT_DETECTED"
    );

    signals.push({
      code: "TEMPORAL_AWARENESS_EVENT",
      severity: "MEDIUM"
    });
  }

  if (disagreement) {

    awarenessIndex -= 10;

    observations.push(
      "CONSENSUS_FRAGMENTATION"
    );

    signals.push({
      code: "CONSENSUS_COGNITION_ALERT",
      severity: "MEDIUM"
    });
  }

  if (predictiveState.includes("LOCKDOWN")) {

    awarenessIndex -= 25;

    observations.push(
      "AUTONOMOUS_LOCKDOWN_PREDICTION"
    );

    signals.push({
      code: "LOCKDOWN_COGNITION_STATE",
      severity: "CRITICAL"
    });
  }

  if (survivability === "DEGRADED") {

    awarenessIndex -= 10;

    observations.push(
      "SURVIVABILITY_DECAY"
    );

    signals.push({
      code: "SURVIVABILITY_AWARENESS",
      severity: "MEDIUM"
    });
  }

  if (awarenessIndex < 0)
    awarenessIndex = 0;

  const consciousnessState =
    awarenessIndex >= 90
      ? "FULL_RUNTIME_AWARENESS"
      : awarenessIndex >= 70
      ? "STABLE_AWARENESS"
      : awarenessIndex >= 45
      ? "DEGRADED_AWARENESS"
      : "CRITICAL_COGNITION_STATE";

  const anomalyCognition =
    signals.length > 0;

  const selfObservation =
    observations.length > 0;

  const cognitionMode =
    awarenessIndex >= 75
      ? "AUTONOMOUS_OBSERVATION"
      : awarenessIndex >= 45
      ? "ANOMALY_MONITORING"
      : "CRITICAL_SELF_PRESERVATION";

  return {
    ok: true,
    type: "EXECUTIA_GOVERNANCE_CONSCIOUSNESS_ENGINE",
    awareness_index: awarenessIndex,
    consciousness_state: consciousnessState,
    anomaly_cognition_detected: anomalyCognition,
    self_observation_active: selfObservation,
    cognition_mode: cognitionMode,
    observations,
    signals,
    summary:
      consciousnessState === "FULL_RUNTIME_AWARENESS"
        ? "Governance runtime awareness fully synchronized."
        : `Governance cognition state: ${consciousnessState}.`
  };
}
