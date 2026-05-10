import { insertGovernanceEvent } from "../services/governance-hash.js";
import { GOVERNANCE_STATES } from "../services/governance-state.js";

/**
 * EXECUTIA V2 — Governance Review Engine
 *
 * Purpose:
 * Materialize operator review escalation runtime.
 */

function resolveExecutionId(request = {}, proof = null) {
  const safeProof = proof && typeof proof === "object" ? proof : {};

  return (
    safeProof.execution_id ||
    safeProof?.execution?.id ||
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
    "EXECUTIA_GOVERNANCE_RUNTIME"
  );
}

export async function createGovernanceReview({
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

  const execution_id = resolveExecutionId(request, proof);
  const actor = resolveActor(request);

  const reviewPayload = {
    execution_id,
    organization_id:
      governance?.organization_id ||
      request?.organization_id ||
      null,

    governance_decision:
      governance?.governance_decision ||
      "PENDING_REVIEW",

    policy_decision:
      policy?.decision ||
      "PENDING_REVIEW",

    review_status: GOVERNANCE_STATES.OPEN,

    risk_score:
      policy?.risk_score || 0,

    requested_by: actor,

    escalation_level:
      policy?.risk_score >= 90
        ? 3
        : policy?.risk_score >= 70
        ? 2
        : 1,

    review_reason:
      policy?.reason ||
      governance?.reason ||
      "POLICY_ESCALATION",

    governance_payload:
      governance || {},

    policy_payload:
      policy || {}
  };

  const {
    data: review,
    error: reviewError
  } = await supabase
    .from("governance_reviews")
    .insert(reviewPayload)
    .select()
    .single();

  if (reviewError) {
    return {
      ok: false,
      error: "GOVERNANCE_REVIEW_CREATE_FAILED",
      message: reviewError.message
    };
  }

  const reviewEvent = await insertGovernanceEvent({
    supabase,
    event: {
      review_id: review.id,
      execution_id,
      actor,
      event_type: "GOVERNANCE_REVIEW_CREATED",
      payload: {
        review_status: GOVERNANCE_STATES.OPEN,
        escalation_level: review.escalation_level,
        risk_score: review.risk_score,
        governance_decision: review.governance_decision,
        policy_decision: review.policy_decision
      }
    }
  });

  return {
    ok: true,
    review,
    review_event: reviewEvent
  };
}

export default createGovernanceReview;
