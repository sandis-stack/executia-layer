import { evaluateRules } from "../engine/rule-evaluator.js";
import { buildLedgerHash } from "../services/ledger.js";

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

const hash = buildLedgerHash({
  previous_hash: "GENESIS",
  execution_id: "test",
  status: "APPROVED",
  payload: { ok: true }
});

if (!hash || hash.length !== 64) throw new Error("Invalid hash");

console.log("EXECUTIA final full layer tests OK");
