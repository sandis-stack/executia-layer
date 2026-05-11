/**
 * EXECUTIA Autonomous Governance Consensus
 * Multi-signal runtime governance consensus engine.
 */

export function buildGovernanceConsensus({
  runtime = null,
  memory = null,
  prediction = null,
  healing_plan = null,
  watchdog_cycle = null
} = {}) {

  const nodes = [];

  const riskLevel =
    String(runtime?.risk?.level || "LOW").toUpperCase();

  const continuity =
    String(runtime?.stability?.continuity || "UNKNOWN").toUpperCase();

  const predictiveState =
    String(prediction?.predictive_state || "PREDICTIVE_STABLE");

  const healingState =
    String(healing_plan?.healing_state || "UNKNOWN");

  const watchdogState =
    String(watchdog_cycle?.autonomous_state || "UNKNOWN");

  nodes.push({
    node: "RISK_NODE",
    state:
      riskLevel === "CRITICAL"
        ? "ESCALATE"
        : riskLevel === "HIGH"
        ? "WATCH"
        : "STABLE"
  });

  nodes.push({
    node: "CONTINUITY_NODE",
    state:
      continuity === "UNSTABLE"
        ? "ESCALATE"
        : "STABLE"
  });

  nodes.push({
    node: "MEMORY_NODE",
    state:
      memory?.recurring_instability
        ? "WATCH"
        : "STABLE"
  });

  nodes.push({
    node: "PREDICTION_NODE",
    state:
      predictiveState.includes("LOCKDOWN")
        ? "ESCALATE"
        : predictiveState.includes("ESCALATION")
        ? "WATCH"
        : "STABLE"
  });

  nodes.push({
    node: "HEALING_NODE",
    state:
      healingState.includes("LOCKDOWN")
        ? "ESCALATE"
        : healingState.includes("RECOVERY")
        ? "WATCH"
        : "STABLE"
  });

  nodes.push({
    node: "WATCHDOG_NODE",
    state:
      watchdogState.includes("FAIL")
        ? "ESCALATE"
        : watchdogState.includes("RECOVERY")
        ? "WATCH"
        : "STABLE"
  });

  const stable =
    nodes.filter(n => n.state === "STABLE").length;

  const watch =
    nodes.filter(n => n.state === "WATCH").length;

  const escalate =
    nodes.filter(n => n.state === "ESCALATE").length;

  const disagreement =
    new Set(nodes.map(n => n.state)).size > 1;

  const consensus =
    escalate >= 3
      ? "ESCALATION_CONSENSUS"
      : watch >= 3
      ? "WATCH_CONSENSUS"
      : stable >= 4
      ? "STABLE_CONSENSUS"
      : "SPLIT_CONSENSUS";

  const quorum =
    consensus !== "SPLIT_CONSENSUS";

  const autonomousDecision =
    consensus === "ESCALATION_CONSENSUS"
      ? "AUTONOMOUS_ESCALATION"
      : consensus === "WATCH_CONSENSUS"
      ? "SUPERVISED_MONITORING"
      : consensus === "STABLE_CONSENSUS"
      ? "CONTINUE_RUNTIME"
      : "MANUAL_GOVERNANCE_REVIEW";

  return {
    ok: true,
    type: "EXECUTIA_GOVERNANCE_CONSENSUS",
    consensus,
    quorum,
    disagreement_detected: disagreement,
    autonomous_decision: autonomousDecision,
    node_summary: {
      stable,
      watch,
      escalate
    },
    nodes,
    summary:
      disagreement
        ? `Governance consensus divergence detected: ${consensus}.`
        : `Governance consensus established: ${consensus}.`
  };
}
