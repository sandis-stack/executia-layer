/**
 * EXECUTIA™ — /engine/dispatch-response-builder.js
 *
 * Single response shape for execute-and-dispatch.
 * Every branch (simulate, block, executed, failed) uses this builder.
 * OpenAPI contract is guaranteed by using this function everywhere.
 */

import { DECISION_STATES } from "./decision-states.js";
import { EXECUTION_STATUS } from "./execution-states.js";

/**
 * Build unified execute-and-dispatch response.
 * All fields always present — null when not applicable.
 *
 * @param {object} params
 * @param {boolean}  params.ok
 * @param {boolean}  params.simulation
 * @param {string}   params.requestId
 * @param {object}   params.decisionResult
 * @param {object}   params.commitResult           - null in simulate mode
 * @param {object[]} params.evaluatedRules
 * @param {object[]} params.invalidRules
 * @param {object}   params.context
 * @param {object[]} params.rulesUsed
 * @param {object}   params.ticket                 - null if not issued
 * @param {string}   params.provider               - null if not dispatched
 * @param {object}   params.executionResult        - null if not dispatched
 * @param {string}   params.executionNote          - human note for non-dispatch branches
 * @returns {object}
 */
export function buildDispatchResponse({
  ok,
  simulation,
  requestId,
  decisionResult,
  commitResult,
  evaluatedRules,
  invalidRules,
  context,
  rulesUsed,
  ticket,
  provider,
  executionResult,
  executionNote,
}) {
  const executionStatus = executionResult?.execution_status
    ?? (ticket ? EXECUTION_STATUS.DISPATCHED : EXECUTION_STATUS.NOT_STARTED);

  const executionOk = executionStatus === EXECUTION_STATUS.EXECUTED;

  return {
    ok,
    simulation:   simulation ?? false,
    request_id:   requestId,

    // ── Phase 1: Decision truth ──────────────────────────────
    decision:       decisionResult.decision,
    decision_state: simulation
      ? DECISION_STATES.SIMULATED
      : commitResult?.decision_state ?? DECISION_STATES.DECIDED,
    commit_state:   simulation
      ? DECISION_STATES.SIMULATED
      : commitResult?.commit_state   ?? DECISION_STATES.FAILED_TO_COMMIT,
    ledger_id:      commitResult?.ledger_id   ?? null,
    truth_hash:     commitResult?.truth_hash  ?? null,
    reason_codes:   decisionResult.reason_codes,

    // ── Phase 2: Execution truth ─────────────────────────────
    ticket_id:               ticket?.id                              ?? null,
    idempotency_key:         ticket?.idempotency_key                 ?? null,
    provider:                provider                                ?? null,
    execution_status:        executionStatus,
    provider_transaction_id: executionResult?.provider_transaction_id ?? null,
    requires_reconciliation: executionResult?.requires_reconciliation ?? false,
    execution_note:          executionNote                           ?? null,

    // Null when execution succeeded, object when failed/unknown
    execution_error: executionResult && !executionOk ? {
      provider_status: executionResult.provider_status,
      details:         executionResult.response_payload,
    } : null,

    // ── Audit ────────────────────────────────────────────────
    rules_evaluated: evaluatedRules.length,
    rules_matched:   evaluatedRules.filter(r => r.matched).length,
    rules_used:      rulesUsed,
    invalid_rules:   invalidRules,
    context_used:    context,

    // ── Errors ───────────────────────────────────────────────
    error_code:    commitResult?.error_code    ?? null,
    error_message: commitResult?.error_message ?? null,
  };
}
