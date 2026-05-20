import { evaluateRules } from "../engine/rule-evaluator.js";
import { buildLedgerHash } from "../services/ledger.js";
import {
  buildCanonicalEvaluation,
  decisionToStatus,
  isCanonicalDecisionEnabled
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

const hash = buildLedgerHash({
  previous_hash: "GENESIS",
  execution_id: "test",
  status: "APPROVED",
  payload: { ok: true }
});

if (!hash || hash.length !== 64) throw new Error("Invalid hash");

console.log("EXECUTIA final full layer tests OK");
