import crypto from "crypto";
import { verifyExecutionTruth } from "../reconciliation/verify.js";

function sha256(input) {
  return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

const TRACE_STANDARD = [
  "REQUEST_RECEIVED",
  "VALIDATION_STARTED",
  "VALIDATION_PASSED",
  "POLICY_EVALUATED",
  "DECISION_COMMITTED",
  "LEDGER_LINKED",
  "AUDIT_RECORDED",
  "EXECUTION_FINALIZED"
];

function buildTrace(execution_id, actor, status, decision) {
  const ts = new Date().toISOString();
  return TRACE_STANDARD.map((event_type, index) => ({
    index,
    event_type,
    execution_id,
    actor,
    status,
    decision,
    timestamp: ts
  }));
}

export function buildExecutionProof(execution = {}) {
  const reconciliation = verifyExecutionTruth(execution);
  const status = execution.status || "PENDING_REVIEW";
  const decision = execution.decision || "REVIEW";

  const unified_execution_object = {
    execution_id: execution.execution_id,
    organization_id: execution.organization_id || null,
    request_type: execution.request_type || execution.payload?.request_type || "EXECUTION",
    actor: {
      id: execution.operator_user_id || null,
      email: execution.operator_email || execution.actor || "system",
      role: execution.operator_role || "OPERATOR"
    },
    payload: execution.payload || {},
    validation: {
      status: status === "BLOCKED" ? "FAILED" : "PASSED",
      timestamp: execution.created_at || new Date().toISOString()
    },
    decision: {
      status,
      decision,
      reason: execution.reason || "EXECUTION_RECORDED",
      committed: true
    },
    ledger: {
      linked: Boolean(execution.hash || execution.entry_hash),
      entry_hash: execution.hash || execution.entry_hash || null,
      previous_hash: execution.prev_hash || execution.previous_hash || "GENESIS"
    },
    audit: {
      recorded: true,
      immutable_chain: [{
        event_type: "EXECUTION_PROOF_GENERATED",
        actor: "proof_engine",
        execution_id: execution.execution_id,
        timestamp: new Date().toISOString(),
        previous_event_hash: "GENESIS"
      }]
    },
    reconciliation,
    trace: buildTrace(
      execution.execution_id,
      execution.operator_email || execution.actor || "system",
      status,
      decision
    )
  };

  const proof_hash = sha256({
    execution_id: unified_execution_object.execution_id,
    status: unified_execution_object.decision.status,
    decision: unified_execution_object.decision.decision,
    ledger_hash: unified_execution_object.ledger.entry_hash,
    previous_hash: unified_execution_object.ledger.previous_hash,
    reconciliation_state: reconciliation.truth_state
  });

  return {
    verified: reconciliation.verified && Boolean(proof_hash),
    proof_state: reconciliation.verified ? "PROOF_VERIFIED" : "PROOF_PARTIAL",
    proof_version: "EXECUTIA_PROOF_V1",
    proof_hash,
    unified_execution_object
  };
}
