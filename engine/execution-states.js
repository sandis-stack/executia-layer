/**
 * EXECUTIA™ — /engine/execution-states.js
 *
 * Execution states are completely separate from decision states.
 *
 * Decision layer:  was the action ALLOWED?
 * Execution layer: did the external system PERFORM it?
 *
 * These must never be conflated.
 */

export const EXECUTION_STATUS = Object.freeze({
  NOT_STARTED:                  "NOT_STARTED",
  DISPATCHED:                   "DISPATCHED",
  PROVIDER_ACCEPTED:            "PROVIDER_ACCEPTED",
  PROVIDER_REJECTED:            "PROVIDER_REJECTED",
  EXECUTED:                     "EXECUTED",
  FAILED:                       "FAILED",
  UNKNOWN_REQUIRES_RECONCILIATION: "UNKNOWN_REQUIRES_RECONCILIATION",
});

/**
 * Terminal execution statuses — no further state transitions allowed.
 */
export const TERMINAL_EXECUTION_STATUSES = new Set([
  EXECUTION_STATUS.EXECUTED,
  EXECUTION_STATUS.PROVIDER_REJECTED,
  EXECUTION_STATUS.FAILED,
]);

/**
 * Is this execution status terminal?
 */
export function isTerminal(status) {
  return TERMINAL_EXECUTION_STATUSES.has(status);
}
