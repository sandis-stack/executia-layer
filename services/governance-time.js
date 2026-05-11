/**
 * EXECUTIA Governance Time Engine
 * Models execution causality, temporal drift and delay distortion.
 */

export function evaluateGovernanceTime({
  runtime = null,
  replay = null,
  reality = null,
  pressure = null,
  gravity = null
} = {}) {

  const events =
    Array.isArray(replay?.events)
      ? replay.events
      : [];

  let temporalIndex = 0;

  const signals = [];
  const delays = [];

  const gravityIndex =
    Number(gravity?.gravity_index || 0);

  const pressureIndex =
    Number(pressure?.pressure_index || 0);

  const divergence =
    reality?.divergence_detected === true;

  for (let i = 1; i < events.length; i++) {

    const prev =
      new Date(events[i - 1].created_at).getTime();

    const curr =
      new Date(events[i].created_at).getTime();

    if (!Number.isNaN(prev) && !Number.isNaN(curr)) {

      const delta =
        Math.floor((curr - prev) / 1000);

      delays.push(delta);

      if (delta > 120) {
        temporalIndex += 8;
      }

      if (delta > 600) {
        temporalIndex += 15;

        signals.push({
          code: "EXECUTION_DELAY_DISTORTION",
          severity: "HIGH",
          delay_seconds: delta
        });
      }
    }
  }

  temporalIndex += Math.floor(pressureIndex * 0.15);
  temporalIndex += Math.floor(gravityIndex * 0.20);

  if (divergence) {

    temporalIndex += 30;

    signals.push({
      code: "TEMPORAL_TRUTH_DIVERGENCE",
      severity: "CRITICAL"
    });
  }

  if (
    runtime?.stability?.continuity === "UNSTABLE"
  ) {

    temporalIndex += 20;

    signals.push({
      code: "TEMPORAL_CONTINUITY_DECAY",
      severity: "HIGH"
    });
  }

  if (temporalIndex > 100)
    temporalIndex = 100;

  const temporalState =
    temporalIndex >= 85
      ? "TEMPORAL_COLLAPSE_RISK"
      : temporalIndex >= 60
      ? "HIGH_TEMPORAL_DISTORTION"
      : temporalIndex >= 35
      ? "TEMPORAL_DRIFT"
      : "TEMPORAL_STABLE";

  const delayedCausality =
    temporalIndex >= 60;

  const latencyAverage =
    delays.length
      ? Math.floor(
          delays.reduce((a, b) => a + b, 0) /
          delays.length
        )
      : 0;

  const balancingMode =
    temporalIndex >= 70
      ? "AUTONOMOUS_TEMPORAL_BALANCING"
      : temporalIndex >= 35
      ? "TEMPORAL_MONITORING"
      : "TEMPORAL_SYNCHRONIZED";

  return {
    ok: true,
    type: "EXECUTIA_GOVERNANCE_TIME_ENGINE",
    temporal_index: temporalIndex,
    temporal_state: temporalState,
    delayed_causality_detected: delayedCausality,
    latency_average_seconds: latencyAverage,
    balancing_mode: balancingMode,
    event_delay_samples: delays.slice(-12),
    signals,
    summary:
      temporalState === "TEMPORAL_STABLE"
        ? "Governance time continuity is synchronized."
        : `Governance temporal state: ${temporalState}.`
  };
}
