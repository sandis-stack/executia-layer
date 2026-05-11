/**
 * EXECUTIA Field Engine
 * Dynamic execution-field topology and
 * civilization-scale governance geometry.
 */

export function evaluateGovernanceField({
  gravity = null,
  pressure = null,
  reality_fabric = null,
  singularity = null,
  quantum = null,
  constitutional = null
} = {}) {

  let fieldStability = 100;

  const activeFields = [];
  const distortions = [];
  const attractors = [];
  const resonanceSignals = [];
  const stabilizationVectors = [];

  const gravityIndex =
    Number(gravity?.gravity_index || 0);

  const pressureIndex =
    Number(pressure?.pressure_index || 0);

  const coherenceIndex =
    Number(
      reality_fabric?.coherence_index || 0
    );

  const singularityIndex =
    Number(
      singularity?.singularity_index || 0
    );

  const probability =
    Number(
      quantum?.coherence_probability || 0
    );

  const constitutionalIntegrity =
    Number(
      constitutional?.constitutional_integrity || 0
    );

  activeFields.push(
    "EXECUTION_STABILITY_FIELD"
  );

  activeFields.push(
    "REALITY_SYNCHRONIZATION_FIELD"
  );

  activeFields.push(
    "CIVILIZATION_CONTINUITY_FIELD"
  );

  attractors.push(
    "AUTONOMOUS_STABILITY_ATTRACTOR"
  );

  if (gravityIndex >= 70) {

    fieldStability -= 20;

    distortions.push(
      "GRAVITY_FIELD_WARP"
    );

    resonanceSignals.push({
      code: "GRAVITY_RESONANCE",
      severity: "HIGH"
    });
  }

  if (pressureIndex >= 70) {

    fieldStability -= 15;

    distortions.push(
      "PRESSURE_FIELD_COMPRESSION"
    );

    resonanceSignals.push({
      code: "PRESSURE_RESONANCE",
      severity: "HIGH"
    });
  }

  if (coherenceIndex < 70) {

    fieldStability -= 20;

    distortions.push(
      "REALITY_FIELD_DRIFT"
    );

    resonanceSignals.push({
      code: "REALITY_RESONANCE_DECAY",
      severity: "HIGH"
    });
  }

  if (singularityIndex >= 70) {

    fieldStability -= 25;

    distortions.push(
      "SINGULARITY_FIELD_COLLAPSE"
    );

    resonanceSignals.push({
      code: "SINGULARITY_RESONANCE",
      severity: "CRITICAL"
    });
  }

  if (probability < 70) {

    fieldStability -= 10;

    distortions.push(
      "QUANTUM_BRANCH_INSTABILITY"
    );

    resonanceSignals.push({
      code: "QUANTUM_RESONANCE_DRIFT",
      severity: "MEDIUM"
    });
  }

  if (constitutionalIntegrity < 70) {

    fieldStability -= 20;

    distortions.push(
      "CONSTITUTIONAL_GEOMETRY_FAILURE"
    );

    resonanceSignals.push({
      code: "CONSTITUTIONAL_RESONANCE_COLLAPSE",
      severity: "CRITICAL"
    });
  }

  if (fieldStability < 0)
    fieldStability = 0;

  const fieldState =
    fieldStability >= 90
      ? "FULL_FIELD_STABILITY"
      : fieldStability >= 70
      ? "STABLE_EXECUTION_FIELD"
      : fieldStability >= 45
      ? "DISTORTED_EXECUTION_FIELD"
      : "FIELD_COLLAPSE_CASCADE";

  if (fieldStability < 70) {

    stabilizationVectors.push(
      "AUTONOMOUS_FIELD_ALIGNMENT"
    );

    stabilizationVectors.push(
      "REALITY_FIELD_REBALANCING"
    );
  }

  if (fieldStability < 45) {

    stabilizationVectors.push(
      "CIVILIZATION_FIELD_CONTAINMENT"
    );
  }

  return {
    ok: true,
    type:
      "EXECUTIA_FIELD_ENGINE",

    field_state:
      fieldState,

    field_stability:
      fieldStability,

    stabilization_required:
      fieldStability < 70,

    active_fields:
      activeFields,

    distortions,

    attractors,

    resonance_signals:
      resonanceSignals,

    stabilization_vectors:
      stabilizationVectors,

    summary:
      fieldState ===
      "FULL_FIELD_STABILITY"
        ? "Execution field fully stabilized."
        : `Execution field state: ${fieldState}.`
  };
}
