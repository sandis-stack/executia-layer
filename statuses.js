export const EXECUTIA_STATUSES = Object.freeze({
  APPROVED: "APPROVED",
  BLOCKED: "BLOCKED",
  PENDING_REVIEW: "PENDING_REVIEW",
  COMMITTED: "COMMITTED",
  FAILED: "FAILED"
});

export const DECISIONS = Object.freeze({
  APPROVE: "APPROVE",
  BLOCK: "BLOCK",
  REVIEW: "REVIEW"
});

export function normalizeStatus(value) {
  const status = String(value || "").trim().toUpperCase();
  if (Object.values(EXECUTIA_STATUSES).includes(status)) return status;
  return EXECUTIA_STATUSES.PENDING_REVIEW;
}
