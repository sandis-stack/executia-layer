/**
 * EXECUTIA™ — /engine/decision-states.js
 * All state constants. Object.freeze — no mutation at runtime.
 */

export const DECISION_STATES = Object.freeze({
  EVALUATED:        "EVALUATED",        // rules ran, result known, not yet committed
  DECIDED:          "DECIDED",          // decision made, pre-commit
  SIMULATED:        "SIMULATED",        // dry-run, nothing written
  COMMITTED:        "COMMITTED",        // written to ledger, hash confirmed
  FAILED_TO_COMMIT: "FAILED_TO_COMMIT", // ledger write failed — retry required
});

export const PROPOSAL_STATES = Object.freeze({
  GENERATED:      "generated",
  VALIDATED:      "validated",
  INVALID:        "invalid",
  PENDING_REVIEW: "pending_review",
  APPROVED:       "approved",
  REJECTED:       "rejected",
  PUBLISHED:      "published",    // only after human approval + schema validation
});
