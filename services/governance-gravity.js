/**
 * EXECUTIA Governance Gravity Engine
 * Models execution collapse vectors, governance singularities
 * and stabilization field behavior.
 */

export function evaluateGovernanceGravity({
  runtime = null,
  pressure = null,
  reality = null,
  prediction = null,
  consensus = null
} = {}) {

  let gravityIndex = 0;

  const vectors = [];
  const signals = [];

  const pressureIndex =
    Number(pressure?.pressure_index || 0);

  const integrityState =
    String(reality?.integrity_state || "UNKNOWN");

  const predictiveState =
    String(prediction?.predictive_state || "UNKNOWN");

  const disagreement =
    consensus?.disagreement_detected === true;

  const survivability =
    String(runtime?.stability?.survivability || "UNKNOWN");

  const continuity =
    String(runtime?.stability?.continuity || "UNKNOWN");

  gravityIndex += Math.floor(pressureIndex * 0.45);

  if (integrityState.includes("DIVERGENCE")) {
    gravityIndex += 25;

    vectors.push("EXECUTION_TRUTH_COLLAPSE");

    signals.push({
      code: "TRUTH_GRAVITY_DISTORTION",
      severity: "CRITICAL"
    });
  }

  if (predictiveState.includes("LOCKDOWN")) {
    gravityIndex += 35;

    vectors.push("AUTONOMOUS_LOCKDOWN_VECTOR");

    signals.push({
      code: "LOCKDOWN_GRAVITY_ACCELERATION",
      severity: "CRITICAL"
    });
  }

  if (predictiveState.includes("ESCALATION")) {
    gravityIndex += 20;

    vectors.push("ESCALATION_VECTOR");

    signals.push({
      code: "ESCALATION_FIELD_DETECTED",
      severity: "HIGH"
    });
  }

  if (disagreement) {
    gravityIndex += 15;

    vectors.push("CONSENSUS_FRAGMENTATION");

    signals.push({
      code: "CONSENSUS_GRAVITY_SPLIT",
      severity: "MEDIUM"
    });
  }

  if (continuity === "UNSTABLE") {
    gravityIndex += 20;

    vectors.push("CONTINUITY_DECAY");

    signals.push({
      code: "EXECUTION_CONTINUITY_DECAY",
      severity: "HIGH"
    });
  }

  if (survivability === "DEGRADED") {
    gravityIndex += 15;

    vectors.push("SURVIVABILITY_COMPRESSION");

    signals.push({
      code: "SURVIVABILITY_GRAVITY_PRESSURE",
      severity: "MEDIUM"
    });
  }

  if (gravityIndex > 100)
    gravityIndex = 100;

  const gravityState =
    gravityIndex >= 85
      ? "SINGULARITY_RISK"
      : gravityIndex >= 65
      ? "COLLAPSE_GRAVITY"
      : gravityIndex >= 40
      ? "GRAVITY_DISTORTION"
      : "STABLE_FIELD";

  const singularityDetected =
    gravityIndex >= 85;

  const stabilizationField =
    gravityIndex >= 70
      ? "AUTONOMOUS_STABILIZATION_REQUIRED"
      : gravityIndex >= 40
      ? "PRESSURE_BALANCING_REQUIRED"
      : "FIELD_STABLE";

  const collapseProbability =
    gravityIndex >= 80
      ? "HIGH"
      : gravityIndex >= 55
      ? "MEDIUM"
      : "LOW";

  return {
    ok: true,
    type: "EXECUTIA_GOVERNANCE_GRAVITY_ENGINE",
    gravity_index: gravityIndex,
    gravity_state: gravityState,
    collapse_probability: collapseProbability,
    singularity_detected: singularityDetected,
    stabilization_field: stabilizationField,
    collapse_vectors: vectors,
    signals,
    summary:
      singularityDetected
        ? "Governance singularity risk detected."
        : `Governance gravity state: ${gravityState}.`
  };
}
