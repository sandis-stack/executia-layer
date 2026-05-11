/**
 * EXECUTIA Execution Reality Engine
 * Detects divergence between governance state and execution reality.
 */

export function evaluateGovernanceReality({
  runtime = null,
  memory = null,
  prediction = null,
  consensus = null,
  replay = null
} = {}) {

  const events =
    Array.isArray(replay?.events)
      ? replay.events
      : [];

  const signals = [];

  let integrityScore = 100;

  const verificationOk =
    runtime?.verification?.verified === true;

  const executionAllowed =
    runtime?.orchestrator?.execution_allowed === true;

  const predictiveState =
    String(prediction?.predictive_state || "UNKNOWN");

  const consensusState =
    String(consensus?.consensus || "UNKNOWN");

  const disagreement =
    consensus?.disagreement_detected === true;

  const recurringInstability =
    memory?.recurring_instability === true;

  const delayedTruth =
    events.length >= 5 &&
    events.some((event) =>
      String(event?.type || "").includes("PENDING")
    );

  const fakeCompletion =
    executionAllowed &&
    predictiveState.includes("LOCKDOWN");

  const brokenContinuity =
    runtime?.stability?.continuity === "UNSTABLE";

  if (!verificationOk) {
    integrityScore -= 50;

    signals.push({
      code: "HASH_CHAIN_UNVERIFIED",
      severity: "CRITICAL"
    });
  }

  if (brokenContinuity) {
    integrityScore -= 25;

    signals.push({
      code: "BROKEN_EXECUTION_CONTINUITY",
      severity: "HIGH"
    });
  }

  if (disagreement) {
    integrityScore -= 15;

    signals.push({
      code: "CONSENSUS_DIVERGENCE",
      severity: "MEDIUM"
    });
  }

  if (recurringInstability) {
    integrityScore -= 10;

    signals.push({
      code: "RECURRING_RUNTIME_INSTABILITY",
      severity: "MEDIUM"
    });
  }

  if (delayedTruth) {
    integrityScore -= 20;

    signals.push({
      code: "DELAYED_TRUTH_DETECTED",
      severity: "HIGH"
    });
  }

  if (fakeCompletion) {
    integrityScore -= 40;

    signals.push({
      code: "EXECUTION_REALITY_DIVERGENCE",
      severity: "CRITICAL"
    });
  }

  if (integrityScore < 0)
    integrityScore = 0;

  const integrityState =
    integrityScore >= 90
      ? "REALITY_VERIFIED"
      : integrityScore >= 70
      ? "REALITY_STABLE"
      : integrityScore >= 45
      ? "REALITY_DEGRADED"
      : "REALITY_DIVERGENCE";

  const truthState =
    delayedTruth
      ? "DELAYED_TRUTH"
      : fakeCompletion
      ? "FALSE_EXECUTION_SIGNAL"
      : "EXECUTION_TRUTH_CONFIRMED";

  const executionAuthenticity =
    integrityScore >= 70 &&
    !fakeCompletion &&
    verificationOk;

  const divergenceDetected =
    integrityState === "REALITY_DIVERGENCE";

  return {
    ok: true,
    type: "EXECUTIA_EXECUTION_REALITY_ENGINE",
    integrity_score: integrityScore,
    integrity_state: integrityState,
    truth_state: truthState,
    execution_authenticity: executionAuthenticity,
    divergence_detected: divergenceDetected,
    delayed_truth_detected: delayedTruth,
    fake_completion_detected: fakeCompletion,
    broken_continuity_detected: brokenContinuity,
    consensus_state: consensusState,
    predictive_state: predictiveState,
    signals,
    summary:
      divergenceDetected
        ? "Execution reality divergence detected."
        : `Execution reality state: ${integrityState}.`
  };
}
