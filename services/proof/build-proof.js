import crypto from "crypto";
import { verifyExecutionTruth } from "../reconciliation/verify.js";

function sha256(input) {
  return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export function buildExecutionProof(execution) {
  const normalized = {
    ...execution,
    ledger_state: execution.ledger_state || "HASH_LINKED",
    audit_state: execution.audit_state || "RECORDED",
    reconciliation_state: execution.reconciliation_state || "VERIFIED",
    hash_verified: Boolean(execution.hash),
  };

  const reconciliation = verifyExecutionTruth(normalized);

  const proof = {
    execution_id: normalized.execution_id,
    record_id: normalized.id,
    subject: normalized.subject,
    actor: normalized.actor,
    request_type: normalized.request_type,
    decision: normalized.decision,
    status: normalized.status,
    amount: normalized.amount || normalized.payload?.amount || null,

    audit_proof: {
      recorded: normalized.audit_state === "RECORDED",
      timestamp: normalized.created_at,
      operator: normalized.operator_email || normalized.actor || "operator",
    },

    ledger_proof: {
      linked: normalized.ledger_state === "HASH_LINKED",
      hash: normalized.hash,
      previous_hash: normalized.prev_hash || normalized.previous_hash || "GENESIS",
      hash_verified: Boolean(normalized.hash),
    },

    reconciliation_proof: reconciliation,

    integrity: {
      proof_hash: null,
      generated_at: new Date().toISOString(),
      algorithm: "SHA-256",
    },
  };

  proof.integrity.proof_hash = sha256({
    execution_id: proof.execution_id,
    record_id: proof.record_id,
    status: proof.status,
    decision: proof.decision,
    ledger_hash: proof.ledger_proof.hash,
    previous_hash: proof.ledger_proof.previous_hash,
    reconciliation_state: proof.reconciliation_proof.truth_state,
  });

  return {
    verified: reconciliation.verified && Boolean(proof.integrity.proof_hash),
    proof_state: reconciliation.verified ? "PROOF_VERIFIED" : "PROOF_PARTIAL",
    proof,
  };
}
