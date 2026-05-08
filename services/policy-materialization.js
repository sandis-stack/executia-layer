/**
 * EXECUTIA V2 — Policy Materialization Service
 *
 * Purpose:
 * Persist governance and policy decisions into audit_events.
 *
 * V1 schema compatible:
 * audit_events(event_type, execution_id, actor, payload)
 */

function safeObject(value) {
  return value && typeof value === "object" ? value : {};
}

function resolveExecutionId(request = {}, proof = {}) {
  return (
    proof.execution_id ||
    proof?.execution?.id ||
    proof?.execution?.execution_id ||
    request.execution_id ||
    request.executionId ||
    null
  );
}

function resolveActor(request = {}) {
  return (
    request.operator_email ||
    request.operator_user_id ||
    request.actor ||
    "EXECUTIA_GOVERNANCE_ENGINE"
  );
}

function governanceEventType(governance = {}) {
  if (governance.governance_decision === "ALLOW_COMMIT") return "GOVERNANCE_DECISION_ALLOWED";
  if (governance.governance_decision === "BLOCK_COMMIT") return "GOVERNANCE_DECISION_BLOCKED";
  return "GOVERNANCE_DECISION_RECORDED";
}

function policyEventType(policy = {}) {
  if (policy.decision === "ALLOW_COMMIT") return "POLICY_DECISION_ALLOWED";
  if (policy.decision === "BLOCK_COMMIT") return "POLICY_DECISION_BLOCKED";
  if (policy.decision === "PENDING_REVIEW") return "POLICY_PENDING_REVIEW";
  return "POLICY_DECISION_RECORDED";
}

export async function materializePolicyDecision({
  supabase,
  request,
  governance,
  policy,
  proof = null
}) {
  if (!supabase) {
    return {
      ok: false,
      error: "SUPABASE_CLIENT_MISSING"
    };
  }

  const safeRequest = safeObject(request);
  const safeGovernance = safeObject(governance);
  const safePolicy = safeObject(policy);
  const safeProof = safeObject(proof);

  const execution_id = resolveExecutionId(safeRequest, safeProof);
  const actor = resolveActor(safeRequest);

  const basePayload = {
    source: "EXECUTIA_V2_GOVERNANCE",
    organization_id:
      safeGovernance.organization_id ||
      safeRequest.organization_id ||
      null,
    authority_id: safeGovernance.authority_id || null,
    jurisdiction: safeGovernance.jurisdiction || null,
    policy_scope: safeGovernance.policy_scope || safePolicy.policy_scope || null,
    execution_type:
      safePolicy.execution_type ||
      safeRequest.execution_type ||
      safeRequest.executionType ||
      safeRequest.type ||
      null
  };

  const events = [
    {
      event_type: governanceEventType(safeGovernance),
      execution_id,
      actor,
      payload: {
        ...basePayload,
        governance_decision: safeGovernance.governance_decision || null,
        permission_verified: safeGovernance.permission_verified === true,
        permission_id: safeGovernance.permission_id || null,
        reason: safeGovernance.reason || null
      }
    },
    {
      event_type: policyEventType(safePolicy),
      execution_id,
      actor,
      payload: {
        ...basePayload,
        policy_decision: safePolicy.decision || null,
        risk_score: safePolicy.risk_score ?? null,
        policy_version: safePolicy.policy_version || "v2",
        matched_rules: Array.isArray(safePolicy.matched_rules)
          ? safePolicy.matched_rules
          : [],
        reason: safePolicy.reason || null
      }
    }
  ];

  const { data, error } = await supabase
    .from("audit_events")
    .insert(events)
    .select();

  if (error) {
    return {
      ok: false,
      error: "POLICY_MATERIALIZATION_FAILED",
      message: error.message
    };
  }

  return {
    ok: true,
    execution_id,
    events_written: data?.length || events.length,
    event_types: events.map((event) => event.event_type)
  };
}

export default materializePolicyDecision;
