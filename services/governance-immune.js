/**
 * EXECUTIA Governance Immune System
 * Detects governance pathogens, corruption patterns
 * and autonomous containment requirements.
 */

export function evaluateGovernanceImmune({
  runtime = null,
  reality = null,
  pressure = null,
  gravity = null,
  consciousness = null,
  evolution = null,
  consensus = null
} = {}) {

  let infectionIndex = 0;

  const pathogens = [];
  const immuneResponses = [];
  const signals = [];

  const divergence =
    reality?.divergence_detected === true;

  const pressureIndex =
    Number(pressure?.pressure_index || 0);

  const gravityIndex =
    Number(gravity?.gravity_index || 0);

  const awarenessIndex =
    Number(consciousness?.awareness_index || 0);

  const adaptationIndex =
    Number(evolution?.adaptation_index || 0);

  const disagreement =
    consensus?.disagreement_detected === true;

  if (divergence) {

    infectionIndex += 35;

    pathogens.push(
      "EXECUTION_TRUTH_PATHOGEN"
    );

    immuneResponses.push(
      "REALITY_ISOLATION_PROTOCOL"
    );

    signals.push({
      code: "TRUTH_CORRUPTION_DETECTED",
      severity: "CRITICAL"
    });
  }

  if (pressureIndex >= 65) {

    infectionIndex += 20;

    pathogens.push(
      "PRESSURE_OVERLOAD_CONTAMINATION"
    );

    immuneResponses.push(
      "PRESSURE_FIELD_REBALANCING"
    );

    signals.push({
      code: "PRESSURE_INFECTION_CLUSTER",
      severity: "HIGH"
    });
  }

  if (gravityIndex >= 75) {

    infectionIndex += 25;

    pathogens.push(
      "COLLAPSE_SINGULARITY"
    );

    immuneResponses.push(
      "GRAVITY_QUARANTINE"
    );

    signals.push({
      code: "COLLAPSE_VECTOR_CONTAMINATION",
      severity: "CRITICAL"
    });
  }

  if (awarenessIndex < 60) {

    infectionIndex += 15;

    pathogens.push(
      "COGNITION_DEGRADATION"
    );

    immuneResponses.push(
      "RUNTIME_AWARENESS_RECOVERY"
    );

    signals.push({
      code: "AWARENESS_IMMUNE_RESPONSE",
      severity: "MEDIUM"
    });
  }

  if (adaptationIndex < 55) {

    infectionIndex += 15;

    pathogens.push(
      "EVOLUTIONARY_STAGNATION"
    );

    immuneResponses.push(
      "AUTONOMOUS_REGENERATION"
    );

    signals.push({
      code: "ADAPTATION_FAILURE_PATTERN",
      severity: "HIGH"
    });
  }

  if (disagreement) {

    infectionIndex += 10;

    pathogens.push(
      "CONSENSUS_FRAGMENT_PATHOGEN"
    );

    immuneResponses.push(
      "CONSENSUS_RESTABILIZATION"
    );

    signals.push({
      code: "CONSENSUS_IMMUNE_ALERT",
      severity: "MEDIUM"
    });
  }

  if (
    runtime?.stability?.survivability ===
    "DEGRADED"
  ) {

    infectionIndex += 20;

    pathogens.push(
      "SURVIVABILITY_DECAY"
    );

    immuneResponses.push(
      "SURVIVAL_STABILIZATION"
    );

    signals.push({
      code: "SURVIVABILITY_CONTAMINATION",
      severity: "HIGH"
    });
  }

  if (infectionIndex > 100)
    infectionIndex = 100;

  const immuneState =
    infectionIndex >= 85
      ? "SYSTEMIC_INFECTION"
      : infectionIndex >= 60
      ? "CRITICAL_IMMUNE_RESPONSE"
      : infectionIndex >= 35
      ? "ACTIVE_IMMUNE_MONITORING"
      : "IMMUNE_STABLE";

  const quarantineRequired =
    infectionIndex >= 70;

  const corruptionDetected =
    pathogens.length > 0;

  const immuneMode =
    infectionIndex >= 75
      ? "AUTONOMOUS_QUARANTINE"
      : infectionIndex >= 40
      ? "ACTIVE_CONTAINMENT"
      : "PASSIVE_MONITORING";

  return {
    ok: true,
    type: "EXECUTIA_GOVERNANCE_IMMUNE_SYSTEM",
    infection_index: infectionIndex,
    immune_state: immuneState,
    quarantine_required: quarantineRequired,
    corruption_detected: corruptionDetected,
    immune_mode: immuneMode,
    pathogens,
    immune_responses: immuneResponses,
    signals,
    summary:
      immuneState === "IMMUNE_STABLE"
        ? "Governance immune state stable."
        : `Governance immune state: ${immuneState}.`
  };
}
