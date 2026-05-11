import {
  resolveJwtContext,
  requireJwtPermission
} from "../../../../services/jwt-auth.js";

import {
  buildGovernanceRuntime
} from "../../../../services/governance-runtime.js";

import {
  runGovernanceWatchdogCycle
} from "../../../../services/governance-watchdog.js";

import {
  planGovernanceSelfHealing
} from "../../../../services/governance-self-healing.js";

import {
  buildGovernanceMemory
} from "../../../../services/governance-memory.js";

import {
  predictGovernanceState
} from "../../../../services/governance-prediction.js";

import {
  buildGovernanceConsensus
} from "../../../../services/governance-consensus.js";

import {
  evaluateGovernanceReality
} from "../../../../services/governance-reality.js";

import {
  evaluateGovernancePressure
} from "../../../../services/governance-pressure.js";

import {
  evaluateGovernanceGravity
} from "../../../../services/governance-gravity.js";

import {
  evaluateGovernanceTime
} from "../../../../services/governance-time.js";

function json(res, status, body) {
  return res.status(status).json(body);
}

export default async function handler(req, res) {
  try {

    if (req.method !== "POST") {
      return json(res, 405, {
        ok: false,
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: "POST required"
        }
      });
    }

    const context = await resolveJwtContext(req);

    const permission = requireJwtPermission(
      context,
      "governance.review.read"
    );

    if (!permission.ok) {
      return json(res, permission.status || 401, {
        ok: false,
        error: {
          code: permission.error || "INVALID_JWT",
          message:
            permission.reason ||
            "Governance runtime permission required."
        }
      });
    }

    const body = req.body || {};

    const runtime = await buildGovernanceRuntime({
      review_id: body.review_id || null,
      execution_id: body.execution_id || null
    });

    const watchdog_cycle =
      runGovernanceWatchdogCycle({
        verification: runtime.verification,
        risk: runtime.risk,
        intelligence: runtime.intelligence,
        stability: runtime.stability,
        containment_plan: runtime.containment_plan,
        recovery_plan: runtime.recovery_plan,
        orchestrator: runtime.orchestrator,
        replay: runtime.replay
      });

    const healing_plan =
      planGovernanceSelfHealing({
        verification: runtime.verification,
        risk: runtime.risk,
        intelligence: runtime.intelligence,
        stability: runtime.stability,
        containment_plan: runtime.containment_plan,
        recovery_plan: runtime.recovery_plan,
        orchestrator: runtime.orchestrator,
        watchdog_cycle,
        replay: runtime.replay
      });

    const memory =
      buildGovernanceMemory({
        replay: runtime.replay,
        risk: runtime.risk,
        intelligence: runtime.intelligence,
        stability: runtime.stability,
        containment_plan: runtime.containment_plan,
        recovery_plan: runtime.recovery_plan,
        orchestrator: runtime.orchestrator
      });

    const prediction =
      predictGovernanceState({
        memory,
        risk: runtime.risk,
        intelligence: runtime.intelligence,
        stability: runtime.stability,
        recovery_plan: runtime.recovery_plan,
        containment_plan: runtime.containment_plan,
        orchestrator: runtime.orchestrator
      });

    const consensus =
      buildGovernanceConsensus({
        runtime,
        memory,
        prediction,
        healing_plan,
        watchdog_cycle
      });

    const reality =
      evaluateGovernanceReality({
        runtime,
        memory,
        prediction,
        consensus,
        replay: runtime.replay
      });

    const pressure =
      evaluateGovernancePressure({
        runtime,
        memory,
        prediction,
        consensus,
        reality
      });

    const gravity =
      evaluateGovernanceGravity({
        runtime,
        pressure,
        reality,
        prediction,
        consensus
      });

    const time =
      evaluateGovernanceTime({
        runtime,
        replay: runtime.replay,
        reality,
        pressure,
        gravity
      });

    return json(res, 200, {
      ok: true,
      scope: "EXECUTIA_RUNTIME_STATE",
      organization_id: context.organization_id,
      runtime,
      watchdog_cycle,
      healing_plan,
      memory,
      prediction,
      consensus,
      reality,
      pressure,
      gravity,
      time,
      runtime_state: {
        autonomous_state:
          watchdog_cycle.autonomous_state,

        healing_state:
          healing_plan.healing_state,

        execution_allowed:
          watchdog_cycle.execution_allowed,

        recovery_allowed:
          runtime.recovery_plan?.recovery_allowed || false,

        containment_mode:
          runtime.containment_plan?.mode || null,

        survivability:
          runtime.stability?.survivability || null,

        continuity:
          runtime.stability?.continuity || null,

        governance_verified:
          runtime.verification?.verified || false,

        memory_state:
          memory.memory_state,

        governance_drift:
          memory.drift,

        predictive_state:
          prediction.predictive_state,

        collapse_probability:
          prediction.collapse_probability,

        consensus:
          consensus.consensus,

        consensus_quorum:
          consensus.quorum,

        autonomous_decision:
          consensus.autonomous_decision,

        reality_state:
          reality.integrity_state,

        execution_authenticity:
          reality.execution_authenticity,

        truth_state:
          reality.truth_state,

        pressure_state:
          pressure.pressure_state,

        pressure_index:
          pressure.pressure_index,

        overload_forecast:
          pressure.overload_forecast,

        gravity_state:
          gravity.gravity_state,

        gravity_index:
          gravity.gravity_index,

        stabilization_field:
          gravity.stabilization_field,

        temporal_state:
          time.temporal_state,

        temporal_index:
          time.temporal_index,

        delayed_causality_detected:
          time.delayed_causality_detected
      }
    });

  } catch (error) {

    console.error(
      "[EXECUTIA RUNTIME STATE ERROR]",
      error
    );

    return json(res, 500, {
      ok: false,
      error: {
        code:
          error.code ||
          "EXECUTIA_RUNTIME_STATE_FAILED",

        message:
          error.message ||
          "Runtime state failed."
      }
    });
  }
}
