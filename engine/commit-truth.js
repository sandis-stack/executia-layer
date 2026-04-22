/**
 * EXECUTIA™ — /engine/commit-truth.js
 * TRUTH COMMITMENT. Atomic. No partial success.
 */

import { DECISION_STATES } from "./decision-states.js";
import { hashPayload } from "../services/hash.js";

export async function commitTruth({
  supabase,
  event,
  context,
  evaluatedRules,
  decisionResult,
  simulation = false,
}) {
  if (simulation) {
    return {
      ok: true,
      decision_state: DECISION_STATES.DECIDED,
      commit_state: DECISION_STATES.SIMULATED,
      ledger_id: null,
      truth_hash: null,
      prev_hash: null,
      error_code: null,
      error_message: null,
    };
  }

  const payload = {
    event,
    context,
    evaluated_rules: evaluatedRules,
    decision_result: decisionResult,
  };

  try {
    const { data: prevEntry, error: prevError } = await supabase
      .from("execution_ledger")
      .select("truth_hash")
      .eq("organization_id", event.organizationId || null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (prevError) {
      return {
        ok: false,
        decision_state: DECISION_STATES.DECIDED,
        commit_state: DECISION_STATES.FAILED_TO_COMMIT,
        ledger_id: null,
        truth_hash: null,
        prev_hash: null,
        error_code: "PREV_HASH_LOOKUP_FAILED",
        error_message: prevError.message,
      };
    }

    const prev_hash = prevEntry?.truth_hash || null;
    const truth_hash = hashPayload({ ...payload, prev_hash });

    const { data, error } = await supabase
      .from("execution_ledger")
      .insert({
        session_id: event.sessionId || null,
        event_type: event.eventType,
        organization_id: event.organizationId || null,
        project_id: event.projectId || null,
        decision: decisionResult.decision,
        reason_codes: decisionResult.reason_codes,
        truth_hash,
        prev_hash,
        payload,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[EXECUTIA][COMMIT] Ledger write failed:", error.message);
      return {
        ok: false,
        decision_state: DECISION_STATES.DECIDED,
        commit_state: DECISION_STATES.FAILED_TO_COMMIT,
        ledger_id: null,
        truth_hash: null,
        prev_hash,
        error_code: "LEDGER_COMMIT_FAILED",
        error_message: error.message,
      };
    }

    return {
      ok: true,
      decision_state: DECISION_STATES.DECIDED,
      commit_state: DECISION_STATES.COMMITTED,
      ledger_id: data.id,
      truth_hash,
      prev_hash,
      error_code: null,
      error_message: null,
    };
  } catch (err) {
    console.error("[EXECUTIA][COMMIT] Unexpected error:", err.message);
    return {
      ok: false,
      decision_state: DECISION_STATES.DECIDED,
      commit_state: DECISION_STATES.FAILED_TO_COMMIT,
      ledger_id: null,
      truth_hash: null,
      prev_hash: null,
      error_code: "LEDGER_COMMIT_FAILED",
      error_message: err.message,
    };
  }
}
