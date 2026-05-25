/**
 * EXECUTIA Canonical Execution Semantics (Phase 6C) — browser presentation mirror.
 * Keep aligned with shared/canonical-execution-semantics.js (semantic only).
 */
(function (global) {
  const CANONICAL_STATE = Object.freeze({
    REQUESTED: "REQUESTED",
    VALIDATED: "VALIDATED",
    PENDING_REVIEW: "PENDING_REVIEW",
    APPROVED: "APPROVED",
    BLOCKED: "BLOCKED",
    COMMITTED: "COMMITTED",
    VERIFIED: "VERIFIED",
    REPLAY_SAFE: "REPLAY_SAFE"
  });

  const CANONICAL_ACTION = Object.freeze({
    VALIDATE: "VALIDATE",
    APPROVE: "APPROVE",
    BLOCK: "BLOCK",
    COMMIT: "COMMIT",
    VERIFY: "VERIFY",
    REPLAY: "REPLAY",
    ESCALATE: "ESCALATE"
  });

  const CANONICAL_AUTHORITY = Object.freeze({
    EXECUTION: "EXECUTION AUTHORITY",
    GOVERNANCE: "GOVERNANCE AUTHORITY",
    CANONICAL: "CANONICAL AUTHORITY",
    REPLAY: "REPLAY AUTHORITY",
    PROOF: "PROOF AUTHORITY"
  });

  const VOCABULARY = Object.freeze({
    GOVERNED: "Governed",
    DETERMINISTIC: "Deterministic",
    CANONICAL: "Canonical",
    CONSEQUENCE: "Consequence",
    CONTINUITY: "Continuity",
    JURISDICTION: "Jurisdiction"
  });

  const ACTION_ALIAS = Object.freeze({
    REJECT: CANONICAL_ACTION.BLOCK,
    VERIFY_REPLAY: CANONICAL_ACTION.REPLAY,
    VERIFY_PROOF: CANONICAL_ACTION.VERIFY,
    FREEZE: CANONICAL_ACTION.ESCALATE
  });

  function resolveCanonicalAction(action) {
    const key = String(action || "").trim().toUpperCase();
    if (CANONICAL_ACTION[key]) return key;
    if (ACTION_ALIAS[key]) return ACTION_ALIAS[key];
    return null;
  }

  function labelForAction(action) {
    const c = resolveCanonicalAction(action);
    if (c === CANONICAL_ACTION.APPROVE) return "EXECUTION AUTHORITY CONFIRMED";
    if (c === CANONICAL_ACTION.BLOCK) return "GOVERNANCE AUTHORITY · BLOCK";
    if (c === CANONICAL_ACTION.COMMIT) return "EXECUTION COMMITTED";
    if (c === CANONICAL_ACTION.REPLAY) return "REPLAY SAFE";
    if (c === CANONICAL_ACTION.VERIFY) return "GOVERNANCE VERIFIED";
    if (c === CANONICAL_ACTION.ESCALATE) return "EXECUTION CONTINUITY MAINTAINED";
    return CANONICAL_AUTHORITY.GOVERNANCE;
  }

  global.EXECUTIA_CANONICAL_SEMANTICS = Object.freeze({
    CANONICAL_STATE,
    CANONICAL_ACTION,
    CANONICAL_AUTHORITY,
    VOCABULARY,
    ACTION_ALIAS,
    resolveCanonicalAction,
    labelForAction
  });
})(typeof window !== "undefined" ? window : globalThis);
