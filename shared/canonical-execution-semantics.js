/**
 * EXECUTIA Canonical Execution Semantics (Phase 6C).
 * Single vocabulary for states, actions, authority, consequence, replay, and proof.
 * Semantic normalization only — does not alter execution RPC behavior.
 */
import { EXECUTIA_STATUSES } from "./statuses.js";

/** Canonical execution states (deterministic meaning). */
export const CANONICAL_STATE = Object.freeze({
  REQUESTED: "REQUESTED",
  VALIDATED: "VALIDATED",
  PENDING_REVIEW: "PENDING_REVIEW",
  APPROVED: "APPROVED",
  BLOCKED: "BLOCKED",
  COMMITTED: "COMMITTED",
  VERIFIED: "VERIFIED",
  REPLAY_SAFE: "REPLAY_SAFE"
});

/** Canonical execution actions (not UI verbs). */
export const CANONICAL_ACTION = Object.freeze({
  VALIDATE: "VALIDATE",
  APPROVE: "APPROVE",
  BLOCK: "BLOCK",
  COMMIT: "COMMIT",
  VERIFY: "VERIFY",
  REPLAY: "REPLAY",
  ESCALATE: "ESCALATE"
});

/** Operator/API action aliases → canonical action. */
export const ACTION_ALIAS = Object.freeze({
  REJECT: CANONICAL_ACTION.BLOCK,
  VERIFY_REPLAY: CANONICAL_ACTION.REPLAY,
  VERIFY_PROOF: CANONICAL_ACTION.VERIFY,
  FREEZE: CANONICAL_ACTION.ESCALATE
});

/** Canonical authority domains. */
export const CANONICAL_AUTHORITY = Object.freeze({
  EXECUTION: "EXECUTION AUTHORITY",
  GOVERNANCE: "GOVERNANCE AUTHORITY",
  CANONICAL: "CANONICAL AUTHORITY",
  REPLAY: "REPLAY AUTHORITY",
  PROOF: "PROOF AUTHORITY"
});

/** Compact institutional vocabulary. */
export const VOCABULARY = Object.freeze({
  GOVERNED: "Governed",
  DETERMINISTIC: "Deterministic",
  CANONICAL: "Canonical",
  CONSEQUENCE: "Consequence",
  CONTINUITY: "Continuity",
  JURISDICTION: "Jurisdiction"
});

/** Per-state deterministic definitions. */
export const STATE_SEMANTICS = Object.freeze({
  [CANONICAL_STATE.REQUESTED]: Object.freeze({
    meaning: "Execution request received under institutional jurisdiction.",
    governance: "Material truth not yet validated; authority awaits engine decision.",
    consequence: "No execution consequence attached — request only.",
    authority: CANONICAL_AUTHORITY.EXECUTION
  }),
  [CANONICAL_STATE.VALIDATED]: Object.freeze({
    meaning: "Engine validation complete; rule evaluation is binding.",
    governance: "Governance layer may advance to review or terminal posture.",
    consequence: "Validation consequence recorded; commitment not yet applied.",
    authority: CANONICAL_AUTHORITY.GOVERNANCE
  }),
  [CANONICAL_STATE.PENDING_REVIEW]: Object.freeze({
    meaning: "Execution held for operator governance review.",
    governance: "Human authority required before terminal consequence.",
    consequence: "Operational consequence deferred — review posture only.",
    authority: CANONICAL_AUTHORITY.GOVERNANCE
  }),
  [CANONICAL_STATE.APPROVED]: Object.freeze({
    meaning: "Governance approved execution under canonical authority.",
    governance: "Terminal approval; commitment and ledger may proceed.",
    consequence: "Execution authority confirmed — irreversible approval class.",
    authority: CANONICAL_AUTHORITY.EXECUTION
  }),
  [CANONICAL_STATE.BLOCKED]: Object.freeze({
    meaning: "Execution blocked by governance authority.",
    governance: "Terminal block; execution must not commit.",
    consequence: "Execution consequence denied — governed block.",
    authority: CANONICAL_AUTHORITY.GOVERNANCE
  }),
  [CANONICAL_STATE.COMMITTED]: Object.freeze({
    meaning: "Execution committed to canonical record and ledger chain.",
    governance: "Canonical transition complete; truth anchored.",
    consequence: "Execution committed — institutional record is binding.",
    authority: CANONICAL_AUTHORITY.CANONICAL
  }),
  [CANONICAL_STATE.VERIFIED]: Object.freeze({
    meaning: "Reconciliation and proof verify execution truth.",
    governance: "Verification phase — truth matches canonical record.",
    consequence: "Governance verified at material truth layer.",
    authority: CANONICAL_AUTHORITY.PROOF
  }),
  [CANONICAL_STATE.REPLAY_SAFE]: Object.freeze({
    meaning: "Deterministic replay revalidation succeeded.",
    governance: "Read-only replay confirms canonical continuity.",
    consequence: "Replay-safe — execution continuity maintained.",
    authority: CANONICAL_AUTHORITY.REPLAY
  })
});

/** Per-action semantic definitions. */
export const ACTION_SEMANTICS = Object.freeze({
  [CANONICAL_ACTION.VALIDATE]: Object.freeze({
    meaning: "Apply engine validation to execution material.",
    consequence: "Moves execution toward VALIDATED or review posture.",
    authority: CANONICAL_AUTHORITY.GOVERNANCE,
    frames: [CANONICAL_STATE.REQUESTED, CANONICAL_STATE.VALIDATED]
  }),
  [CANONICAL_ACTION.APPROVE]: Object.freeze({
    meaning: "Affirm governance approval under execution authority.",
    consequence: "Terminal approval — execution authority confirmed.",
    authority: CANONICAL_AUTHORITY.EXECUTION,
    frames: [CANONICAL_STATE.PENDING_REVIEW, CANONICAL_STATE.APPROVED]
  }),
  [CANONICAL_ACTION.BLOCK]: Object.freeze({
    meaning: "Deny execution under governance authority.",
    consequence: "Terminal block — execution consequence denied.",
    authority: CANONICAL_AUTHORITY.GOVERNANCE,
    frames: [CANONICAL_STATE.PENDING_REVIEW, CANONICAL_STATE.BLOCKED]
  }),
  [CANONICAL_ACTION.COMMIT]: Object.freeze({
    meaning: "Commit approved execution to canonical record.",
    consequence: "Execution committed — ledger and audit bind.",
    authority: CANONICAL_AUTHORITY.CANONICAL,
    frames: [CANONICAL_STATE.APPROVED, CANONICAL_STATE.COMMITTED]
  }),
  [CANONICAL_ACTION.VERIFY]: Object.freeze({
    meaning: "Verify proof and reconciliation against canonical truth.",
    consequence: "Governance verified — execution truth confirmed.",
    authority: CANONICAL_AUTHORITY.PROOF,
    frames: [CANONICAL_STATE.COMMITTED, CANONICAL_STATE.VERIFIED]
  }),
  [CANONICAL_ACTION.REPLAY]: Object.freeze({
    meaning: "Deterministic read-only replay revalidation.",
    consequence: "Replay-safe continuity or replay check recorded.",
    authority: CANONICAL_AUTHORITY.REPLAY,
    frames: [CANONICAL_STATE.COMMITTED, CANONICAL_STATE.REPLAY_SAFE]
  }),
  [CANONICAL_ACTION.ESCALATE]: Object.freeze({
    meaning: "Escalate execution for extended governance review.",
    consequence: "Continuity maintained — review posture extended.",
    authority: CANONICAL_AUTHORITY.GOVERNANCE,
    frames: [CANONICAL_STATE.PENDING_REVIEW]
  })
});

export const CONSEQUENCE_SEMANTICS = Object.freeze({
  IRREVERSIBLE:
    "Terminal consequence is institutionally binding — governed, traceable, not revocable without proof.",
  ACCOUNTABILITY: "Authority actor is accountable at canonical verify before consequence attaches.",
  TRACE: "Every consequence remains deterministic and auditable at verify.",
  CONTINUITY: "Execution continuity maintained across governed transitions."
});

export const REPLAY_SEMANTICS = Object.freeze({
  MODE: "Read-only deterministic revalidation",
  CONTINUITY: "Canonical continuity preserved across hash-linked chain",
  GOVERNED: "Replay does not mutate execution truth — governance read-only",
  RESULT_SAFE: CANONICAL_STATE.REPLAY_SAFE,
  RESULT_CHECK: "REPLAY_CHECK"
});

export const PROOF_SEMANTICS = Object.freeze({
  TRUTH: "Execution truth anchored at canonical verify",
  VERIFICATION: "Canonical verification of material truth",
  CONTINUITY: "Proof implies replay-safe continuity when chain complete",
  AUTHORITY: CANONICAL_AUTHORITY.PROOF
});

export const OPERATOR_JURISDICTION = Object.freeze({
  SCOPE: "Operator acts within execution authority jurisdiction — not application workflow.",
  SUPREMACY: "Governance authority supreme over infrastructure state.",
  ACCOUNTABILITY: "Operator consequence is material and audit-bound.",
  READ_ONLY_REPLAY: "Replay and proof verify remain read-only under operator jurisdiction."
});

/** Runtime status → canonical state (1:1 where defined). */
export const STATUS_TO_CANONICAL = Object.freeze({
  [EXECUTIA_STATUSES.PENDING_REVIEW]: CANONICAL_STATE.PENDING_REVIEW,
  [EXECUTIA_STATUSES.APPROVED]: CANONICAL_STATE.APPROVED,
  [EXECUTIA_STATUSES.BLOCKED]: CANONICAL_STATE.BLOCKED,
  [EXECUTIA_STATUSES.COMMITTED]: CANONICAL_STATE.COMMITTED,
  [EXECUTIA_STATUSES.FAILED]: CANONICAL_STATE.BLOCKED
});

export const COMMIT_FLOW_CANONICAL = Object.freeze([
  CANONICAL_STATE.REQUESTED,
  CANONICAL_STATE.VALIDATED,
  CANONICAL_STATE.PENDING_REVIEW,
  CANONICAL_STATE.COMMITTED,
  CANONICAL_STATE.VERIFIED,
  CANONICAL_STATE.REPLAY_SAFE
]);

export function resolveCanonicalAction(action) {
  const key = String(action || "").trim().toUpperCase();
  if (CANONICAL_ACTION[key]) return key;
  if (ACTION_ALIAS[key]) return ACTION_ALIAS[key];
  return null;
}

export function canonicalStateForStatus(status) {
  const key = String(status || "").trim().toUpperCase();
  return STATUS_TO_CANONICAL[key] || (STATE_SEMANTICS[key] ? key : null);
}

export function canonicalStateDefinition(state) {
  const key = canonicalStateForStatus(state) || String(state || "").trim().toUpperCase();
  return STATE_SEMANTICS[key] || null;
}

export function semanticsForAction(action) {
  const canonical = resolveCanonicalAction(action);
  if (!canonical) return [];
  const def = ACTION_SEMANTICS[canonical];
  if (!def) return [];
  return [def.authority, def.consequence, ...def.frames];
}

export function presentationFramesForAction(action) {
  const canonical = resolveCanonicalAction(action);
  if (!canonical) return [];
  const def = ACTION_SEMANTICS[canonical];
  return def ? [...def.frames] : [];
}

export function traceStepsForAction(action) {
  const canonical = resolveCanonicalAction(action);
  const map = {
    [CANONICAL_ACTION.APPROVE]: [
      CANONICAL_STATE.PENDING_REVIEW,
      CANONICAL_STATE.APPROVED,
      CANONICAL_STATE.COMMITTED,
      CANONICAL_STATE.REPLAY_SAFE
    ],
    [CANONICAL_ACTION.BLOCK]: [
      CANONICAL_STATE.PENDING_REVIEW,
      CANONICAL_STATE.BLOCKED
    ],
    [CANONICAL_ACTION.COMMIT]: [
      CANONICAL_STATE.COMMITTED,
      CANONICAL_STATE.VERIFIED,
      CANONICAL_STATE.REPLAY_SAFE
    ],
    [CANONICAL_ACTION.REPLAY]: [CANONICAL_STATE.REPLAY_SAFE],
    [CANONICAL_ACTION.VERIFY]: [CANONICAL_STATE.VERIFIED, CANONICAL_STATE.COMMITTED],
    [CANONICAL_ACTION.ESCALATE]: [CANONICAL_STATE.PENDING_REVIEW]
  };
  return map[canonical] || [];
}

export function buildCanonicalTransitionMeta({ action, previous_state, next_state }) {
  const canonicalAction = resolveCanonicalAction(action);
  const from = canonicalStateForStatus(previous_state) || previous_state;
  const to = canonicalStateForStatus(next_state) || next_state;
  return {
    canonical_action: canonicalAction,
    canonical_previous: from,
    canonical_next: to,
    previous_definition: canonicalStateDefinition(from),
    next_definition: canonicalStateDefinition(to),
    semantics: semanticsForAction(action),
    consequence: CONSEQUENCE_SEMANTICS,
    replay: REPLAY_SEMANTICS,
    proof: PROOF_SEMANTICS,
    jurisdiction: OPERATOR_JURISDICTION
  };
}
