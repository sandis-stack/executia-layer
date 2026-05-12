import {
  runGovernanceWatchdog
} from "./governance-watchdog.js";

import {
  runGovernanceOrchestrator
} from "./governance-orchestrator.js";

import {
  applyGovernanceContainment
} from "./governance-containment.js";

import {
  runGovernanceRecovery
} from "./governance-recovery.js";

function now(){
  return new Date().toISOString();
}

function buildAutonomousState(runtime = {}) {
  const state = runtime.runtime_state || {};

  const riskScore =
    Number(state.systemic_risk_score || 0) +
    Number(state.entropy_score || 0) +
    Number(state.instability_score || 0);

  const freezeDetected =
    state.execution_allowed === false ||
    state.freeze_active === true;

  const chainBroken =
    state.synchronization_stable === false ||
    state.delayed_causality_detected === true;

  const recoveryRequired =
    chainBroken ||
    freezeDetected ||
    riskScore >= 70;

  return {
    timestamp: now(),
    risk_score: riskScore,
    freeze_detected: freezeDetected,
    chain_broken: chainBroken,
    recovery_required: recoveryRequired,
    autonomous_state:
      recoveryRequired
        ? "AUTONOMOUS_STABILIZATION"
        : "AUTONOMOUS_STABLE"
  };
}

export async function runAutonomousGovernanceLoop({
  runtime = {},
  review_id = null,
  execution_id = null
} = {}) {

  const autonomous = buildAutonomousState(runtime);

  const watchdog = await runGovernanceWatchdog({
    runtime,
    review_id,
    execution_id
  });

  let orchestrator = null;
  let containment = null;
  let recovery = null;

  if (autonomous.recovery_required) {

    orchestrator = await runGovernanceOrchestrator({
      runtime,
      review_id,
      execution_id,
      autonomous_state: autonomous.autonomous_state
    });

    containment = await applyGovernanceContainment({
      runtime,
      review_id,
      execution_id,
      reason: "AUTONOMOUS_RUNTIME_CONTAINMENT"
    });

    recovery = await runGovernanceRecovery({
      runtime,
      review_id,
      execution_id,
      autonomous: true
    });
  }

  return {
    ok: true,
    mode: "EXECUTIA_AUTONOMOUS_GOVERNANCE_LOOP",
    generated_at: now(),

    review_id,
    execution_id,

    autonomous,

    watchdog: watchdog || null,
    orchestrator: orchestrator || null,
    containment: containment || null,
    recovery: recovery || null
  };
}
