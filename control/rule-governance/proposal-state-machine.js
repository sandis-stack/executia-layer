/**
 * EXECUTIA™ — /governance/proposal-state-machine.js
 * State machine for rule proposals.
 *
 * Valid transitions:
 *   generated      → validated | invalid
 *   validated      → pending_review
 *   pending_review → approved | rejected
 *   approved       → published
 *   invalid        → (terminal)
 *   rejected       → (terminal)
 *   published      → (terminal — only deactivation, never revert)
 */

import { PROPOSAL_STATES } from "../engine/decision-states.js";

const TRANSITIONS = {
  [PROPOSAL_STATES.GENERATED]:      [PROPOSAL_STATES.VALIDATED, PROPOSAL_STATES.INVALID],
  [PROPOSAL_STATES.VALIDATED]:      [PROPOSAL_STATES.PENDING_REVIEW],
  [PROPOSAL_STATES.PENDING_REVIEW]: [PROPOSAL_STATES.APPROVED, PROPOSAL_STATES.REJECTED],
  [PROPOSAL_STATES.APPROVED]:       [PROPOSAL_STATES.PUBLISHED],
  [PROPOSAL_STATES.INVALID]:        [],  // terminal
  [PROPOSAL_STATES.REJECTED]:       [],  // terminal
  [PROPOSAL_STATES.PUBLISHED]:      [],  // terminal (deactivate via active flag, not state)
};

/**
 * Assert a state transition is valid.
 * @param {string} from - Current state
 * @param {string} to   - Target state
 * @throws Error if transition is not allowed
 */
export function assertValidTransition(from, to) {
  const allowed = TRANSITIONS[from];
  if (!allowed) throw new Error(`Unknown proposal state: "${from}"`);
  if (!allowed.includes(to)) {
    throw new Error(
      `Invalid proposal state transition: ${from} → ${to}. ` +
      `Allowed from ${from}: ${allowed.join(", ") || "(none — terminal state)"}`
    );
  }
}

/**
 * Get allowed next states for a given current state.
 */
export function getAllowedTransitions(currentState) {
  return TRANSITIONS[currentState] || [];
}

/**
 * Check if a proposal can be published.
 * Requirements: state=approved, condition_json validated, human approver set.
 */
export function canPublish(proposal) {
  const reasons = [];
  if (proposal.state !== PROPOSAL_STATES.APPROVED) {
    reasons.push(`state must be "approved", got "${proposal.state}"`);
  }
  if (!proposal.approved_by) {
    reasons.push("approved_by must be set (human approver required)");
  }
  if (!proposal.validated_at) {
    reasons.push("validated_at must be set (schema validation required)");
  }
  return { canPublish: reasons.length === 0, reasons };
}
