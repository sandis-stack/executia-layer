export function applyRules(input = {}) {
  const amount = Number(input.amount || 0);
  const context = input.context || {};

  let decision = "APPROVE";
  let reason = "Execution approved";
  let reason_code = "APPROVED";

  if (amount <= 0) {
    decision = "BLOCK";
    reason = "Amount must be greater than zero";
    reason_code = "INVALID_AMOUNT";
  }

  if (context.legalBlock === true) {
    decision = "BLOCK";
    reason = "Legal block detected";
    reason_code = "LEGAL_BLOCK";
  }

  if (decision === "APPROVE" && amount > 10000) {
    decision = "ESCALATE";
    reason = "High-value payment requires review";
    reason_code = "HIGH_VALUE_PAYMENT";
  }

  return {
    decision,
    reason,
    reason_code
  };
}
