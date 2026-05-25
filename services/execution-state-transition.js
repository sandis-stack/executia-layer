/**
 * EXECUTIA Execution State Transition System (Phase 6B + 6C semantics).
 * Deterministic governed transitions — mechanics delegate to canonical semantics.
 */
import { EXECUTIA_STATUSES } from "../shared/statuses.js";
import {
  CANONICAL_STATE,
  buildCanonicalTransitionMeta,
  resolveCanonicalAction,
  semanticsForAction,
  traceStepsForAction
} from "../shared/canonical-execution-semantics.js";

/** Presentation labels aligned with canonical authority (not UI workflow). */
export const EXECUTION_SEMANTICS = Object.freeze({
  EXECUTION_COMMITTED: "EXECUTION COMMITTED",
  GOVERNANCE_VERIFIED: "GOVERNANCE VERIFIED",
  CANONICAL_TRANSITION: "CANONICAL TRANSITION",
  EXECUTION_AUTHORITY_CONFIRMED: "EXECUTION AUTHORITY CONFIRMED",
  REPLAY_SAFE: "REPLAY SAFE",
  EXECUTION_CONTINUITY_MAINTAINED: "EXECUTION CONTINUITY MAINTAINED"
});

export const EXECUTION_VERIFICATION_PHASE = CANONICAL_STATE.VERIFIED;

export const OPERATOR_ACTIONS = Object.freeze({
  APPROVE: "APPROVE",
  REJECT: "REJECT",
  FREEZE: "FREEZE",
  ESCALATE: "ESCALATE",
  COMMIT: "COMMIT",
  VERIFY_REPLAY: "VERIFY_REPLAY",
  VERIFY_PROOF: "VERIFY_PROOF"
});

const TERMINAL_ACTIONS = new Set([OPERATOR_ACTIONS.APPROVE, OPERATOR_ACTIONS.REJECT]);

function spec(from, to, action) {
  return {
    from,
    to,
    semantics: semanticsForAction(action),
    trace: traceStepsForAction(action)
  };
}

export const EXECUTION_TRANSITIONS = Object.freeze({
  [OPERATOR_ACTIONS.APPROVE]: spec(
    [EXECUTIA_STATUSES.PENDING_REVIEW],
    EXECUTIA_STATUSES.APPROVED,
    OPERATOR_ACTIONS.APPROVE
  ),
  [OPERATOR_ACTIONS.REJECT]: spec(
    [EXECUTIA_STATUSES.PENDING_REVIEW],
    EXECUTIA_STATUSES.BLOCKED,
    OPERATOR_ACTIONS.REJECT
  ),
  [OPERATOR_ACTIONS.FREEZE]: spec(
    [EXECUTIA_STATUSES.PENDING_REVIEW, EXECUTIA_STATUSES.APPROVED],
    EXECUTIA_STATUSES.PENDING_REVIEW,
    OPERATOR_ACTIONS.FREEZE
  ),
  [OPERATOR_ACTIONS.ESCALATE]: spec(
    [EXECUTIA_STATUSES.PENDING_REVIEW],
    EXECUTIA_STATUSES.PENDING_REVIEW,
    OPERATOR_ACTIONS.ESCALATE
  ),
  [OPERATOR_ACTIONS.COMMIT]: spec(
    [EXECUTIA_STATUSES.APPROVED],
    EXECUTIA_STATUSES.COMMITTED,
    OPERATOR_ACTIONS.COMMIT
  ),
  [OPERATOR_ACTIONS.VERIFY_REPLAY]: spec(
    [
      EXECUTIA_STATUSES.PENDING_REVIEW,
      EXECUTIA_STATUSES.APPROVED,
      EXECUTIA_STATUSES.BLOCKED,
      EXECUTIA_STATUSES.COMMITTED
    ],
    null,
    OPERATOR_ACTIONS.VERIFY_REPLAY
  ),
  [OPERATOR_ACTIONS.VERIFY_PROOF]: spec(
    [
      EXECUTIA_STATUSES.PENDING_REVIEW,
      EXECUTIA_STATUSES.APPROVED,
      EXECUTIA_STATUSES.BLOCKED,
      EXECUTIA_STATUSES.COMMITTED
    ],
    null,
    OPERATOR_ACTIONS.VERIFY_PROOF
  )
});

export class ExecutionTransitionError extends Error {
  constructor(code, message, status = 409) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function resolveOperatorAction(action) {
  const key = String(action || "").trim().toUpperCase();
  if (!EXECUTION_TRANSITIONS[key]) {
    throw new ExecutionTransitionError(
      "INVALID_OPERATOR_ACTION",
      `Invalid operator action: ${action || "(empty)"}.`,
      400
    );
  }
  if (!resolveCanonicalAction(key)) {
    throw new ExecutionTransitionError(
      "INVALID_OPERATOR_ACTION",
      `Action has no canonical interpretation: ${key}.`,
      400
    );
  }
  return key;
}

export function isTerminalOperatorAction(action) {
  return TERMINAL_ACTIONS.has(resolveOperatorAction(action));
}

export function assertExecutionTransition(fromStatus, action) {
  const specRow = EXECUTION_TRANSITIONS[resolveOperatorAction(action)];
  const from = String(fromStatus || "").trim().toUpperCase();

  if (!specRow.from.includes(from)) {
    throw new ExecutionTransitionError(
      "INVALID_EXECUTION_STATUS",
      `Execution cannot ${action} from status ${from || "(empty)"}.`,
      409
    );
  }

  return { ...specRow, to: specRow.to ?? from };
}

export function buildTransitionPayload({
  action,
  previous_state,
  next_state,
  actor,
  reason = null,
  extra = {}
}) {
  const specRow = EXECUTION_TRANSITIONS[resolveOperatorAction(action)];
  const semantics = [...specRow.semantics];
  const verification_phase =
    next_state === EXECUTIA_STATUSES.APPROVED || next_state === EXECUTIA_STATUSES.COMMITTED
      ? EXECUTION_VERIFICATION_PHASE
      : null;

  const canonical = buildCanonicalTransitionMeta({
    action,
    previous_state,
    next_state
  });

  return {
    action: resolveOperatorAction(action),
    previous_state,
    next_state,
    canonical_previous: canonical.canonical_previous,
    canonical_next: canonical.canonical_next,
    canonical_action: canonical.canonical_action,
    semantics,
    verification_phase,
    canonical,
    trace: buildGovernedTrace(specRow.trace, { actor, reason }),
    governed: true,
    ...extra
  };
}

export function buildGovernedTrace(steps, { actor, reason }) {
  const at = new Date().toISOString();
  return (steps || []).map((step) => ({
    step,
    timestamp: at,
    actor: actor || "operator",
    reason: reason || null
  }));
}

export function surfaceForAction(action) {
  const canonical = resolveCanonicalAction(action);
  const map = {
    APPROVE: "execution-approval",
    BLOCK: "governance-transition",
    COMMIT: "canonical-commit",
    REPLAY: "replay-verification",
    VERIFY: "proof-authority",
    ESCALATE: "governance-transition"
  };
  return map[canonical] || "governance-transition";
}
