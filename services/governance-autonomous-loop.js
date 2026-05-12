import {
  runGovernanceWatchdogCycle
} from "./governance-watchdog.js";

import {
  orchestrateGovernanceCycle
} from "./governance-orchestrator.js";

import {
  buildGovernanceContainmentPlan
} from "./governance-containment.js";

import {
  buildGovernanceRecoveryPlan
} from "./governance-recovery.js";

function now(){
  return new Date().toISOString();
}

function buildAutonomousState(runtime = {}) {
  const verification = runtime.verification || {};
  const risk = runtime.risk || {};
  const intelligence = runtime.intelligence || {};
  const stability = runtime.stability || {};
  const replay = runtime.replay || {};

  const riskScore =
    Number(risk.score || 0) +
    Number(intelligence.score || 0);

  const freezeDetected =
    replay.stopped === true ||
    runtime.freeze_active === true;

  const chainBroken =
    verification.verified === false;

  const recoveryRequired =
    chainBroken ||
    freezeDetected ||
    riskScore >= 70 ||
    stability.continuity === "UNSTABLE";

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

  const containment_plan = buildGovernanceContainmentPlan({
    verification: runtime.verification,
    risk: runtime.risk,
    intelligence: runtime.intelligence,
    stability: runtime.stability,
    replay: runtime.replay
  });

  const recovery_plan = buildGovernanceRecoveryPlan({
    verification: runtime.verification,
    risk: runtime.risk,
    intelligence: runtime.intelligence,
    stability: runtime.stability,
    containment_plan,
    replay: runtime.replay
  });

  const orchestrator = orchestrateGovernanceCycle({
    verification: runtime.verification,
    risk: runtime.risk,
    intelligence: runtime.intelligence,
    stability: runtime.stability,
    containment_plan,
    recovery_plan,
    replay: runtime.replay
  });

  const watchdog = runGovernanceWatchdogCycle({
    verification: runtime.verification,
    risk: runtime.risk,
    intelligence: runtime.intelligence,
    stability: runtime.stability,
    containment_plan,
    recovery_plan,
    orchestrator,
    replay: runtime.replay
  });

  return {
    ok: true,
    mode: "EXECUTIA_AUTONOMOUS_GOVERNANCE_LOOP",
    generated_at: now(),

    review_id,
    execution_id,

    autonomous,
    watchdog,
    orchestrator,
    containment: containment_plan,
    recovery: recovery_plan
  };
}
