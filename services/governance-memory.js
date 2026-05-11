/**
 * EXECUTIA Governance Memory
 * Builds deterministic memory signals from replay events.
 */

export function buildGovernanceMemory({
  replay = null,
  risk = null,
  intelligence = null,
  stability = null,
  recovery_plan = null,
  containment_plan = null,
  orchestrator = null
} = {}) {
  const events = Array.isArray(replay?.events) ? replay.events : [];

  const counts = {};
  const recent = events.slice(-20);

  for (const event of events) {
    const type = event?.type || "UNKNOWN";
    counts[type] = (counts[type] || 0) + 1;
  }

  const schedulerCycles = events.filter((event) =>
    String(event?.type || "").includes("SCHEDULER_CYCLE")
  ).length;

  const selfHealingPlans = events.filter((event) =>
    String(event?.type || "").includes("SELF_HEALING")
  ).length;

  const containmentEvents = events.filter((event) =>
    String(event?.type || "").includes("CONTAINMENT") ||
    String(event?.type || "").includes("FREEZE") ||
    String(event?.type || "").includes("BLOCK")
  ).length;

  const recoveryEvents = events.filter((event) =>
    String(event?.type || "").includes("RECOVERY") ||
    String(event?.type || "").includes("RESUMED")
  ).length;

  const recurringInstability =
    containmentEvents >= 2 ||
    schedulerCycles >= 3 ||
    selfHealingPlans >= 2;

  const drift =
    recurringInstability
      ? "GOVERNANCE_DRIFT_DETECTED"
      : "NO_DRIFT_DETECTED";

  const memory_state =
    stability?.continuity === "UNSTABLE" ||
    risk?.level === "HIGH" ||
    risk?.level === "CRITICAL"
      ? "MEMORY_ALERT"
      : recurringInstability
      ? "MEMORY_WATCH"
      : "MEMORY_STABLE";

  const signals = [];

  if (schedulerCycles) {
    signals.push({
      code: "SCHEDULER_ACTIVITY",
      value: schedulerCycles,
      severity: schedulerCycles >= 3 ? "MEDIUM" : "LOW"
    });
  }

  if (selfHealingPlans) {
    signals.push({
      code: "SELF_HEALING_HISTORY",
      value: selfHealingPlans,
      severity: selfHealingPlans >= 2 ? "MEDIUM" : "LOW"
    });
  }

  if (containmentEvents) {
    signals.push({
      code: "CONTAINMENT_HISTORY",
      value: containmentEvents,
      severity: containmentEvents >= 2 ? "HIGH" : "MEDIUM"
    });
  }

  if (recoveryEvents) {
    signals.push({
      code: "RECOVERY_HISTORY",
      value: recoveryEvents,
      severity: "LOW"
    });
  }

  return {
    ok: true,
    type: "EXECUTIA_GOVERNANCE_MEMORY",
    memory_state,
    drift,
    recurring_instability: recurringInstability,
    event_count: events.length,
    scheduler_cycles: schedulerCycles,
    self_healing_plans: selfHealingPlans,
    containment_events: containmentEvents,
    recovery_events: recoveryEvents,
    risk_level: risk?.level || "UNKNOWN",
    incident: intelligence?.incident || "UNKNOWN",
    continuity: stability?.continuity || "UNKNOWN",
    survivability: stability?.survivability || "UNKNOWN",
    containment_mode: containment_plan?.mode || "UNKNOWN",
    recovery_mode: recovery_plan?.mode || "UNKNOWN",
    orchestrator_priority: orchestrator?.priority || "UNKNOWN",
    event_type_counts: counts,
    recent_events: recent.map((event) => ({
      type: event?.type || null,
      stage: event?.stage || null,
      sequence_no: event?.sequence_no || null,
      hash: event?.hash || null,
      created_at: event?.created_at || null
    })),
    signals,
    summary:
      memory_state === "MEMORY_STABLE"
        ? "Governance memory is stable."
        : `Governance memory state: ${memory_state}; drift: ${drift}.`
  };
}
