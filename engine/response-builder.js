/**
 * EXECUTIA™ — /engine/response-builder.js
 * One canonical response shape. Always.
 * ok=true only when commitResult.ok=true.
 */

export function buildExecutionResponse({
  commitResult,
  event,
  context,
  evaluatedRules,
  decisionResult,
  simulation,
  requestId,
  rulesUsed    = [],
  invalidRules = [],
}) {
  return {
    ok:         commitResult.ok,
    simulation,
    request_id: requestId || null,

    event: {
      eventType:      event.eventType,
      organizationId: event.organizationId,
      projectId:      event.projectId || null,
    },

    // Decision
    decision:       decisionResult.decision,
    decision_state: commitResult.decision_state,
    reason_codes:   decisionResult.reason_codes,

    // Commit
    commit_state:   commitResult.commit_state,
    ledger_id:      commitResult.ledger_id,
    truth_hash:     commitResult.truth_hash,

    // Audit trail
    rules_evaluated: evaluatedRules.length,
    rules_matched:   evaluatedRules.filter(r => r.matched).length,
    rules_used:      rulesUsed,
    invalid_rules:   invalidRules,
    context_used:    context,

    // Errors (null when ok)
    error_code:    commitResult.error_code    || null,
    error_message: commitResult.error_message || null,
  };
}

/**
 * Canonical error response. Every endpoint uses this for early-exit errors.
 * Guarantees consistent shape: ok, error_code, error_message, request_id, [error_detail].
 */
export function buildErrorResponse(errorCode, message, detail = null, requestId = null) {
  return {
    ok:            false,
    request_id:    requestId,
    error_code:    errorCode,
    error_message: message,
    ...(detail ? { error_detail: detail } : {}),
  };
}
