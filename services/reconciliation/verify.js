export function verifyExecutionTruth(execution) {
  const proof = {
    execution_exists: Boolean(execution),
    hash_exists: Boolean(execution?.hash),
    previous_hash_exists: Boolean(execution?.prev_hash || execution?.previous_hash),
    ledger_linked: execution?.ledger_state === "HASH_LINKED",
    audit_recorded: execution?.audit_state === "RECORDED",
    reconciliation_state: execution?.reconciliation_state || "PENDING",
    hash_verified: Boolean(execution?.hash_verified),
    status_valid: [
      "COMMITTED",
      "BLOCKED",
      "PENDING_REVIEW",
      "FAILED",
      "APPROVED"
    ].includes(execution?.status),
  };

  const score = Object.values(proof).filter(v => v === true).length;

  const truth_state =
    score >= 6 ? "VERIFIED" :
    score >= 4 ? "PARTIAL" :
    "UNVERIFIED";

  return {
    verified: truth_state === "VERIFIED",
    truth_state,
    proof_score: score,
    proof
  };
}
