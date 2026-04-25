// api/core/engine.js

export function decideExecution(input = {}) {
  const amount = Number(input.amount || 0);
  const context = input.context || {};

  let decision = "APPROVE";
  let reason = "Execution approved";
  const reason_codes = ["APPROVED"];

  if (amount <= 0) {
    decision = "BLOCK";
    reason = "Amount must be greater than zero";
    reason_codes.length = 0;
    reason_codes.push("INVALID_AMOUNT");
  }

  if (context.legalBlock === true) {
    decision = "BLOCK";
    reason = "Legal block detected";
    reason_codes.length = 0;
    reason_codes.push("LEGAL_BLOCK");
  }

  if (decision === "APPROVE" && amount > 10000) {
    decision = "ESCALATE";
    reason = "High-value payment requires review";
    reason_codes.length = 0;
    reason_codes.push("HIGH_VALUE_PAYMENT");
  }

  return {
    decision,
    reason,
    reason_codes
  };
}
