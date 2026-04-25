import { createTruthHash } from "./hash.js";

export function createLedgerEntry(input = {}, ruleResult = {}, dispatchResult = {}) {
  const payload = {
    session_id: input.session_id || input.sessionId || "demo_session",
    organization_id: input.organization_id || input.organizationId || "org_demo",
    project_id: input.project_id || input.projectId || null,
    event_type: input.event_type || input.eventType || "payment",
    amount: Number(input.amount || 0),
    currency: input.currency || "EUR",
    context: input.context || {},
    decision: ruleResult.decision,
    reason: ruleResult.reason,
    reason_code: ruleResult.reason_code,
    execution_status: dispatchResult.execution_status,
    created_at: new Date().toISOString()
  };

  return {
    ...payload,
    truth_hash: createTruthHash(payload)
  };
}
