/**
 * EXECUTIA Canonical Execution Semantics — server re-export and helpers.
 */
export {
  CANONICAL_STATE,
  CANONICAL_ACTION,
  ACTION_ALIAS,
  CANONICAL_AUTHORITY,
  VOCABULARY,
  STATE_SEMANTICS,
  ACTION_SEMANTICS,
  CONSEQUENCE_SEMANTICS,
  REPLAY_SEMANTICS,
  PROOF_SEMANTICS,
  OPERATOR_JURISDICTION,
  STATUS_TO_CANONICAL,
  COMMIT_FLOW_CANONICAL,
  resolveCanonicalAction,
  canonicalStateForStatus,
  canonicalStateDefinition,
  semanticsForAction,
  presentationFramesForAction,
  traceStepsForAction,
  buildCanonicalTransitionMeta
} from "../shared/canonical-execution-semantics.js";
