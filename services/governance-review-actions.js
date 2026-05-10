import { insertGovernanceEvent } from "./governance-hash.js";
import { GOVERNANCE_STATES, assertGovernanceTransition, resolveGovernanceState } from "./governance-state.js";
/**
 * EXECUTIA V2 — Governance Review Actions
 *
 * Purpose:
 * Finalize governance reviews through operator actions.
 */

const ACTIONS = Object.freeze({
  APPROVE: "APPROVE",
  REJECT: "REJECT",
  OVERRIDE: "OVERRIDE"
});

function resolveActor(context = {}, body = {}) {
  return (
    context?.user?.email ||
    context?.user?.id ||
    body?.actor ||
    "EXECUTIA_OPERATOR"
  );
}

function normalizeAction(action) {
  if (action === ACTIONS.APPROVE) {
    return {
      review_status: GOVERNANCE_STATES.APPROVED,
      governance_decision: "ALLOW_COMMIT",
      event_type: "GOVERNANCE_APPROVED"
    };
  }

  if (action === ACTIONS.REJECT) {
    return {
      review_status: GOVERNANCE_STATES.REJECTED,
      governance_decision: "BLOCK_COMMIT",
      event_type: "GOVERNANCE_REJECTED"
    };
  }

  if (action === ACTIONS.OVERRIDE) {
    return {
      review_status: GOVERNANCE_STATES.OVERRIDDEN,
      governance_decision: "ALLOW_COMMIT",
      event_type: "GOVERNANCE_OVERRIDDEN"
    };
  }

  return null;
}

export async function finalizeGovernanceReview({
  supabase,
  review_id,
  action,
  context = {},
  body = {}
}) {
  if (!supabase) {
    return { ok: false, error: "SUPABASE_CLIENT_MISSING" };
  }

  if (!review_id) {
    return { ok: false, error: "REVIEW_ID_REQUIRED" };
  }

  const normalized = normalizeAction(action);

  if (!normalized) {
    return { ok: false, error: "INVALID_GOVERNANCE_ACTION" };
  }

  const actor = resolveActor(context, body);
  const reason = body.reason || body.review_reason || null;

  const { data: existingReview, error: readError } = await supabase
    .from("governance_reviews")
    .select("*")
    .eq("id", review_id)
    .maybeSingle();

  if (readError) {
    return {
      ok: false,
      error: "GOVERNANCE_REVIEW_READ_FAILED",
      message: readError.message
    };
  }

  if (!existingReview) {
    return { ok: false, error: "GOVERNANCE_REVIEW_NOT_FOUND" };
  }

  if (existingReview.review_status && existingReview.review_status !== GOVERNANCE_STATES.OPEN) {
    return {
      ok: false,
      error: "GOVERNANCE_REVIEW_ALREADY_CLOSED",
      review_status: existingReview.review_status
    };
  }

  const currentGovernanceState = resolveGovernanceState(existingReview);
  assertGovernanceTransition(
    currentGovernanceState,
    normalized.review_status
  );

  const { data: updatedReview, error: updateError } = await supabase
    .from("governance_reviews")
    .update({
      review_status: normalized.review_status,
      governance_decision: normalized.governance_decision,
      assigned_to: existingReview.assigned_to || actor,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", review_id)
    .select()
    .single();

  if (updateError) {
    return {
      ok: false,
      error: "GOVERNANCE_REVIEW_UPDATE_FAILED",
      message: updateError.message
    };
  }

  const eventPayload = {
    action,
    review_status: normalized.review_status,
    governance_decision: normalized.governance_decision,
    reason,
    previous_review_status: existingReview.review_status,
    previous_governance_decision: existingReview.governance_decision,
    operator_user_id: context?.user?.id || null,
    operator_email: context?.user?.email || null,
    operator_role: context?.user?.role || context?.role || null
  };

  let reviewEvent;

  try {
    reviewEvent = await insertGovernanceEvent({
      supabase,
      event: {
        review_id,
        execution_id: existingReview.execution_id || null,
        actor,
        event_type: normalized.event_type,
        payload: eventPayload,
        created_at: new Date().toISOString()
      }
    });
  } catch (eventError) {
    return {
      ok: false,
      error: "GOVERNANCE_REVIEW_EVENT_FAILED",
      message: eventError.message,
      review: updatedReview
    };
  }

  await supabase.from("audit_events").insert({
    event_type: normalized.event_type,
    execution_id: existingReview.execution_id || null,
    actor,
    payload: {
      source: "EXECUTIA_V2_GOVERNANCE",
      review_id,
      organization_id: existingReview.organization_id || null,
      action,
      review_status: normalized.review_status,
      governance_decision: normalized.governance_decision,
      policy_decision: existingReview.policy_decision || null,
      risk_score: existingReview.risk_score || 0,
      reason
    }
  });

  return {
    ok: true,
    action,
    review: updatedReview,
    review_event: reviewEvent
  };
}

export default finalizeGovernanceReview;
