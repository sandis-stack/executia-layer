/**
 * EXECUTIA™ — /shared/types.js
 * Canonical type definitions. JSDoc only — no runtime overhead.
 *
 * @typedef {Object} CanonicalContext
 * @property {string}       eventType
 * @property {string}       organizationId
 * @property {string|null}  projectId
 * @property {number|null}  budgetRemaining
 * @property {number|null}  budgetAllocated
 * @property {number|null}  workersAvailable
 * @property {number|null}  hoursSinceRest
 * @property {boolean|null} supplierVerified
 * @property {boolean|null} contractValid
 * @property {number|null}  weatherRisk
 * @property {boolean|null} legalBlock
 * @property {number|null}  completedTasks
 * @property {number|null}  pendingTasks
 * @property {number|null}  amount
 * @property {string|null}  currency
 *
 * @typedef {Object} ExecutionRule
 * @property {string}       id
 * @property {string}       name
 * @property {string}       event_type
 * @property {string|null}  organization_id
 * @property {string|null}  project_id
 * @property {object}       condition_json
 * @property {"ALLOW"|"ESCALATE"|"BLOCK"} effect
 * @property {number}       priority
 * @property {"published"}  status
 *
 * @typedef {Object} RuleResult
 * @property {string}  rule_id
 * @property {string}  rule_name
 * @property {"ALLOW"|"ESCALATE"|"BLOCK"} effect
 * @property {number}  priority
 * @property {boolean} matched
 *
 * @typedef {Object} ConflictResult
 * @property {"ALLOW"|"ESCALATE"|"BLOCK"} winning_effect
 * @property {RuleResult[]} winning_rules
 * @property {string[]}     reason_codes
 *
 * @typedef {Object} ComplianceDecision
 * @property {"APPROVE"|"ESCALATE"|"BLOCK"} decision
 * @property {"low"|"medium"|"high"} severity
 * @property {string[]} reason_codes
 *
 * @typedef {Object} CommitResult
 * @property {"SIMULATED"|"COMMITTED"|"FAILED_TO_COMMIT"} commit_state
 * @property {string|null} ledger_id
 * @property {string|null} truth_hash
 * @property {string}      [error_code]
 * @property {string}      [error_message]
 */

// Runtime sentinel — import this to verify module loaded
export const TYPES_LOADED = true;
