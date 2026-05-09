import crypto from "crypto";
import { db } from "../services/db.js";
import { materializePolicyDecision } from "../services/policy-materialization.js";

export async function resumeGovernedExecution({
  review_id,
  operator_id,
  organization_id
}) {
  if (!review_id) {
    throw new Error("review_id_required");
  }

  const supabase = db();

  const { data: review, error: reviewError } = await supabase
    .from("governance_reviews")
    .select("*")
    .eq("id", review_id)
    .single();

  if (reviewError || !review) {
    throw new Error("review_not_found");
  }

  if (review.organization_id !== organization_id) {
    throw new Error("organization_scope_violation");
  }

  if (review.review_status !== "APPROVED") {
    return {
      ok: false,
      skipped: true,
      reason: "review_not_approved",
      review_status: review.review_status,
      execution_id: review.execution_id
    };
  }

  if (!review.execution_id) {
    throw new Error("execution_id_missing");
  }

  const execution_id = review.execution_id;

  if (["RESUMING", "COMMITTED"].includes(review.execution_status)) {
    return {
      ok: true,
      already_processed: true,
      execution_id,
      execution_status: review.execution_status
    };
  }

  const { data: lockResult, error: lockError } = await supabase
    .from("governance_reviews")
    .update({
      execution_status: "RESUMING",
      resumed_at: new Date().toISOString(),
      resumed_by: operator_id
    })
    .eq("id", review_id)
    .eq("execution_status", "PENDING_REVIEW")
    .select();

  if (lockError) {
    throw lockError;
  }

  if (!lockResult || lockResult.length === 0) {
    return {
      ok: true,
      already_locked: true,
      execution_id,
      execution_status: review.execution_status
    };
  }

  const executionPayload =
    review.execution_payload ||
    review.policy_payload ||
    {};

  const materialization = await materializePolicyDecision({
    supabase,
    request: {
      execution_id,
      organization_id,
      operator_user_id: operator_id,
      execution_type: review.governance_payload?.execution_type,
      policy_scope: review.governance_payload?.policy_scope,
      jurisdiction: review.governance_payload?.jurisdiction
    },
    governance: review.governance_payload || {},
    policy: review.policy_payload || {},
    proof: { execution_id }
  });

  const { error: finalizeError } = await supabase
    .from("governance_reviews")
    .update({
      execution_status: "COMMITTED",
      committed_at: new Date().toISOString()
    })
    .eq("id", review_id);

  if (finalizeError) {
    throw finalizeError;
  }

  const governanceEvent = {
    id: crypto.randomUUID(),
    review_id,
    execution_id,
    organization_id,
    actor: operator_id || "SYSTEM",
    event_type: "GOVERNANCE_EXECUTION_RESUMED",
    payload: {
      operator_id,
      materialization
    },
    created_at: new Date().toISOString()
  };

  const { error: eventError } = await supabase
    .from("governance_review_events")
    .insert(governanceEvent);

  if (eventError) {
    throw eventError;
  }

  return {
    ok: true,
    review_id,
    execution_id,
    execution_status: "COMMITTED",
    materialization
  };
}
