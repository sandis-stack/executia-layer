import { evaluateRules } from "../engine/rule-evaluator.js";
import { buildLedgerHash } from "../services/ledger.js";
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

const hash = buildLedgerHash({
  previous_hash: "GENESIS",
  execution_id: "test",
  status: "APPROVED",
  payload: { ok: true }
});

if (!hash || hash.length !== 64) throw new Error("Invalid hash");

console.log("EXECUTIA final full layer tests OK");
