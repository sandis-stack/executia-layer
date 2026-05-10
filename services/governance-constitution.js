import crypto from "crypto";

const CONSTITUTION_RULES = Object.freeze({
  PROOF_CHAIN_IMMUTABLE: "PROOF_CHAIN_IMMUTABLE",
  FREEZE_RELEASE_REQUIRES_QUORUM: "FREEZE_RELEASE_REQUIRES_QUORUM",
  L4_INCIDENT_NO_DIRECT_OVERRIDE: "L4_INCIDENT_NO_DIRECT_OVERRIDE",
  COMMIT_REQUIRES_TRACE: "COMMIT_REQUIRES_TRACE",
  GOVERNANCE_EVENTS_IMMUTABLE: "GOVERNANCE_EVENTS_IMMUTABLE"
});

function sha256(input) {
  return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export function constitutionBlock(rule, reason, context = {}) {
  const event = {
    type: "CONSTITUTION_BLOCK",
    rule,
    reason,
    context,
    created_at: new Date().toISOString()
  };

  return {
    ok: false,
    blocked: true,
    error: {
      code: "CONSTITUTION_BLOCK",
      message: reason,
      rule,
      event_hash: sha256(event)
    },
    event
  };
}

export function constitutionTriggered(rule, context = {}) {
  const event = {
    type: "CONSTITUTION_RULE_TRIGGERED",
    rule,
    context,
    created_at: new Date().toISOString()
  };

  return {
    ok: true,
    triggered: true,
    event,
    event_hash: sha256(event)
  };
}

export function constitutionOverrideDenied(rule, reason, context = {}) {
  const event = {
    type: "CONSTITUTION_OVERRIDE_DENIED",
    rule,
    reason,
    context,
    created_at: new Date().toISOString()
  };

  return {
    ok: false,
    denied: true,
    error: {
      code: "CONSTITUTION_OVERRIDE_DENIED",
      message: reason,
      rule,
      event_hash: sha256(event)
    },
    event
  };
}

export function assertFreezeReleaseAllowed({ quorum_met, freeze_level, actor_role } = {}) {
  if (!quorum_met) {
    return constitutionBlock(
      CONSTITUTION_RULES.FREEZE_RELEASE_REQUIRES_QUORUM,
      "Freeze release requires governance quorum.",
      { quorum_met, freeze_level, actor_role }
    );
  }

  return constitutionTriggered(
    CONSTITUTION_RULES.FREEZE_RELEASE_REQUIRES_QUORUM,
    { quorum_met, freeze_level, actor_role }
  );
}

export function assertL4OverrideAllowed({ incident_level, override_requested, actor_role } = {}) {
  if (incident_level === "L4" && override_requested) {
    return constitutionOverrideDenied(
      CONSTITUTION_RULES.L4_INCIDENT_NO_DIRECT_OVERRIDE,
      "L4 incident cannot be directly overridden.",
      { incident_level, override_requested, actor_role }
    );
  }

  return constitutionTriggered(
    CONSTITUTION_RULES.L4_INCIDENT_NO_DIRECT_OVERRIDE,
    { incident_level, override_requested, actor_role }
  );
}

export function assertCommitHasTrace({ trace_id, execution_id } = {}) {
  if (!trace_id) {
    return constitutionBlock(
      CONSTITUTION_RULES.COMMIT_REQUIRES_TRACE,
      "Committed execution requires trace reference.",
      { trace_id, execution_id }
    );
  }

  return constitutionTriggered(
    CONSTITUTION_RULES.COMMIT_REQUIRES_TRACE,
    { trace_id, execution_id }
  );
}

export { CONSTITUTION_RULES };
