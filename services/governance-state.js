export const GOVERNANCE_STATES = Object.freeze({
  OPEN: "OPEN",
  QUORUM_PENDING: "QUORUM_PENDING",
  QUORUM_MET: "QUORUM_MET",
  FROZEN: "FROZEN",
  UNDER_SUPERVISION: "UNDER_SUPERVISION",
  OVERRIDDEN: "OVERRIDDEN",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  COMMITTED: "COMMITTED",
  EXPIRED: "EXPIRED"
});

export const GOVERNANCE_TRANSITIONS = Object.freeze({
  OPEN: [
    "QUORUM_PENDING",
    "QUORUM_MET",
    "APPROVED",
    "REJECTED",
    "OVERRIDDEN",
    "FROZEN",
    "UNDER_SUPERVISION",
    "EXPIRED"
  ],

  QUORUM_PENDING: [
    "QUORUM_MET",
    "APPROVED",
    "REJECTED",
    "FROZEN",
    "UNDER_SUPERVISION",
    "EXPIRED"
  ],

  QUORUM_MET: [
    "APPROVED",
    "COMMITTED",
    "FROZEN"
  ],

  APPROVED: [
    "COMMITTED",
    "FROZEN"
  ],

  FROZEN: [
    "UNDER_SUPERVISION",
    "QUORUM_PENDING",
    "APPROVED",
    "COMMITTED",
    "REJECTED"
  ],

  UNDER_SUPERVISION: [
    "APPROVED",
    "REJECTED",
    "OVERRIDDEN",
    "FROZEN"
  ],

  OVERRIDDEN: [
    "COMMITTED",
    "FROZEN"
  ],

  REJECTED: [],
  COMMITTED: [],
  EXPIRED: []
});

export function assertGovernanceTransition(fromState, toState) {
  const from = fromState || GOVERNANCE_STATES.OPEN;
  const to = toState || GOVERNANCE_STATES.OPEN;

  if (from === to) {
    return true;
  }

  const allowed = GOVERNANCE_TRANSITIONS[from] || [];

  if (!allowed.includes(to)) {
    const error = new Error("INVALID_GOVERNANCE_STATE_TRANSITION");
    error.code = "INVALID_GOVERNANCE_STATE_TRANSITION";
    error.from = from;
    error.to = to;
    throw error;
  }

  return true;
}

export function resolveGovernanceState(review = {}) {
  if (review.execution_status === "COMMITTED") {
    return GOVERNANCE_STATES.COMMITTED;
  }

  if (review.review_status === "APPROVED") {
    return GOVERNANCE_STATES.APPROVED;
  }

  if (review.review_status === "REJECTED") {
    return GOVERNANCE_STATES.REJECTED;
  }

  if (review.review_status === "OVERRIDDEN") {
    return GOVERNANCE_STATES.OVERRIDDEN;
  }

  return review.review_status || GOVERNANCE_STATES.OPEN;
}
