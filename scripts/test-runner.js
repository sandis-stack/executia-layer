import { evaluateRules } from "../engine/rule-evaluator.js";
import { buildLedgerHash, LEDGER_HASH_FORMULA_ID } from "../services/ledger.js";
import { buildExecutionHash } from "../services/audit.js";
import {
  applyOperatorDecision,
  buildCanonicalEvaluation,
  decisionToStatus,
  isCanonicalDecisionEnabled,
  isRpcOnlyOperatorEnabled,
  normalizeOperatorDecision,
  OperatorDecisionError,
  operatorDecisionToStatus
} from "../services/execution.js";
import { DECISIONS } from "../shared/statuses.js";

const approved = evaluateRules({
  request_type: "PAYMENT",
  actor: "bank-operator",
  subject: "invoice-001",
  amount: 100,
  rule_context: { approval_limit: 1000 }
});

if (approved.decision !== "APPROVE") throw new Error("Expected APPROVE");

const blocked = evaluateRules({
  request_type: "PAYMENT",
  actor: "bank-operator",
  subject: "invoice-002",
  amount: 2000,
  rule_context: { approval_limit: 1000 }
});

if (blocked.decision !== "BLOCK") throw new Error("Expected BLOCK");

const review = evaluateRules({ request_type: "PAYMENT" });
if (review.decision !== "REVIEW") throw new Error("Expected REVIEW");

const highRisk = evaluateRules({
  request_type: "PAYMENT",
  actor: "bank-operator",
  subject: "invoice-high-risk",
  amount: 1000000,
  rule_context: { approval_limit: 2000000000 }
});

if (highRisk.decision !== DECISIONS.REVIEW) throw new Error("Expected REVIEW for HIGH risk amount");
if (highRisk.reason !== "HIGH_RISK_REQUIRES_REVIEW") throw new Error("Expected HIGH_RISK_REQUIRES_REVIEW");

const canonical = buildCanonicalEvaluation({
  request_type: "PAYMENT",
  actor: "bank-operator",
  subject: "invoice-high-risk",
  amount: 1000000,
  rule_context: { approval_limit: 2000000000 }
});

if (canonical.version !== "1") throw new Error("Expected canonical_evaluation version 1");
if (canonical.decision !== DECISIONS.REVIEW) throw new Error("Expected canonical REVIEW decision");
if (canonical.status !== decisionToStatus(DECISIONS.REVIEW)) throw new Error("Expected canonical PENDING_REVIEW status");
if (canonical.source !== "engine/rule-evaluator") throw new Error("Expected engine/rule-evaluator source");

if (!isCanonicalDecisionEnabled()) throw new Error("Expected canonical decision enabled by default");

if (!isRpcOnlyOperatorEnabled()) throw new Error("Expected RPC-only operator enabled by default");
if (normalizeOperatorDecision("APPROVE") !== "APPROVE") throw new Error("Expected APPROVE normalization");
if (normalizeOperatorDecision("APPROVED") !== "APPROVE") throw new Error("Expected APPROVED → APPROVE normalization");
if (normalizeOperatorDecision("BLOCK") !== "BLOCK") throw new Error("Expected BLOCK normalization");
if (normalizeOperatorDecision("BLOCKED") !== "BLOCK") throw new Error("Expected BLOCKED → BLOCK normalization");
if (operatorDecisionToStatus("APPROVED") !== "APPROVED") throw new Error("Expected APPROVED → APPROVED status");
if (operatorDecisionToStatus("BLOCKED") !== "BLOCKED") throw new Error("Expected BLOCKED → BLOCKED status");

let invalidDecisionThrew = false;
try {
  normalizeOperatorDecision("REJECT");
} catch (error) {
  if (error instanceof OperatorDecisionError && error.code === "INVALID_OPERATOR_DECISION") {
    invalidDecisionThrew = true;
  }
}
if (!invalidDecisionThrew) throw new Error("Expected REJECT to throw INVALID_OPERATOR_DECISION");

let emptyDecisionThrew = false;
try {
  normalizeOperatorDecision("");
} catch (error) {
  if (error instanceof OperatorDecisionError && error.code === "INVALID_OPERATOR_DECISION") {
    emptyDecisionThrew = true;
  }
}
if (!emptyDecisionThrew) throw new Error("Expected empty decision to throw INVALID_OPERATOR_DECISION");

const dryApprove = await applyOperatorDecision({
  execution_id: "00000000-0000-0000-0000-000000000099",
  decision: "APPROVE",
  reason: "TEST"
});
if (dryApprove.status !== "APPROVED" || dryApprove.mode !== "DRY_RUN") {
  throw new Error("Expected DRY_RUN APPROVED operator decision");
}

const vectorExecutionId = "550e8400-e29b-41d4-a716-446655440000";

const approvedGenesis = buildLedgerHash({
  previous_hash: "GENESIS",
  execution_id: vectorExecutionId,
  status: "APPROVED",
  decision: "APPROVE"
});

const blockedGenesis = buildLedgerHash({
  previous_hash: "GENESIS",
  execution_id: vectorExecutionId,
  status: "BLOCKED",
  decision: "BLOCK"
});

const reviewGenesis = buildLedgerHash({
  previous_hash: "GENESIS",
  execution_id: vectorExecutionId,
  status: "PENDING_REVIEW",
  decision: "REVIEW"
});

const chainedBlocked = buildLedgerHash({
  previous_hash: approvedGenesis,
  execution_id: vectorExecutionId,
  status: "BLOCKED",
  decision: "BLOCK"
});

for (const h of [approvedGenesis, blockedGenesis, reviewGenesis, chainedBlocked]) {
  if (!h || h.length !== 64) throw new Error("Invalid ledger hash vector length");
}

if (approvedGenesis === blockedGenesis || approvedGenesis === reviewGenesis) {
  throw new Error("Ledger hash vectors must be distinct for different states");
}

if (chainedBlocked === blockedGenesis) {
  throw new Error("Chained ledger hash must differ from GENESIS-chained BLOCKED");
}

const projectionHash = buildExecutionHash(
  {
    execution_id: vectorExecutionId,
    status: "APPROVED",
    decision: "APPROVE",
    payload: {}
  },
  "GENESIS"
);

if (projectionHash !== approvedGenesis) {
  throw new Error("buildExecutionHash must delegate to ledger.js canonical formula");
}

if (LEDGER_HASH_FORMULA_ID !== "executia/ledger/v1") {
  throw new Error("Unexpected ledger hash formula id");
}

const {
  resolveLedgerVerifyAuthority,
  LEDGER_VERIFY_AUTHORITY_MODE
} = await import("../api/v1/ledger-verify.js");

const ledgerOk = { verified: true, entries: 10 };
const execFail = {
  verified: false,
  entries: 10,
  tampered_execution_id: "93d10bcc-518b-4353-8e0b-852e04d34aa4"
};
const coreFail = {
  verified: false,
  entries: 5,
  tampered_id: "ed9f4e9c-2c9b-4eb1-a117-391bb135e718"
};
const auditOk = { verified: true, accounts_checked: 3, mismatches: [] };

const phase31 = resolveLedgerVerifyAuthority({
  ledger: ledgerOk,
  executions: execFail,
  coreLedger: coreFail,
  accountAudit: auditOk
});

if (phase31.verified !== true) {
  throw new Error("Phase 3A.1: verified must follow ledger_chain when ledger verified");
}
if (phase31.authority_mode !== LEDGER_VERIFY_AUTHORITY_MODE) {
  throw new Error("Phase 3A.1: expected LEDGER_ENTRIES_PRIMARY authority_mode");
}
if (!phase31.legacy_projection_warning?.tampered_execution_id) {
  throw new Error("Phase 3A.1: legacy_projection_warning must retain tampered_execution_id");
}
if (!phase31.legacy_core_ledger_warning?.tampered_id) {
  throw new Error("Phase 3A.1: legacy_core_ledger_warning must retain tampered_id");
}
if (phase31.legacy_verified.composite_all_chains !== false) {
  throw new Error("Phase 3A.1: composite_all_chains must reflect legacy components");
}
if (phase31.legacy_verified.execution_projection !== false) {
  throw new Error("Phase 3A.1: legacy_verified.execution_projection mismatch");
}

const allLegacyOk = resolveLedgerVerifyAuthority({
  ledger: ledgerOk,
  executions: { verified: true, entries: 1 },
  coreLedger: { verified: true, entries: 1 },
  accountAudit: auditOk
});

if (allLegacyOk.verified !== true || allLegacyOk.legacy_projection_warning !== null) {
  throw new Error("Phase 3A.1: no warnings when all legacy chains verify");
}

const ledgerFail = resolveLedgerVerifyAuthority({
  ledger: { verified: false, entries: 1, reason: "ENTRY_HASH_MISMATCH" },
  executions: execFail,
  coreLedger: coreFail,
  accountAudit: auditOk
});

if (ledgerFail.verified !== false) {
  throw new Error("Phase 3A.1: verified must be false when ledger_chain fails");
}
if (ledgerFail.legacy_projection_warning !== null) {
  throw new Error("Phase 3A.1: no projection warning when ledger_chain not verified");
}

console.log("EXECUTIA final full layer tests OK");
