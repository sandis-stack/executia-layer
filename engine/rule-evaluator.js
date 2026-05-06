import { DECISIONS } from "../shared/statuses.js";
import { calculateRiskScore } from "./risk-engine.js";

export function validateExecutionRequest(body = {}) {
  const errors = [];

  if (!body.request_type) errors.push("request_type is required");
  if (!body.actor) errors.push("actor is required");
  if (!body.subject) errors.push("subject is required");
  if (!body.rule_context) errors.push("rule_context is required");

  return { valid: errors.length === 0, errors };
}

export function evaluateRules(body = {}) {
  const validation = validateExecutionRequest(body);
  const risk = calculateRiskScore(body);

  if (!validation.valid) {
    return {
      decision: DECISIONS.REVIEW,
      reason: "VALIDATION_INCOMPLETE",
      validation
    };
  }

  const requestedAmount = Number(body.amount || 0);
  const approvalLimit = Number(body.rule_context?.approval_limit || 0);

  if (requestedAmount && approvalLimit && requestedAmount > approvalLimit) {
    return {
      decision: DECISIONS.BLOCK,
      reason: "AMOUNT_EXCEEDS_APPROVAL_LIMIT",
      validation
    };
  }

  if (body.rule_context?.requires_operator === true) {
    return {
      decision: DECISIONS.REVIEW,
      reason: "OPERATOR_REQUIRED",
      validation
    };
  }

  if (risk.level === "HIGH") {
    return {
      decision: DECISIONS.REVIEW,
      reason: "HIGH_RISK_REQUIRES_REVIEW",
      validation,
      risk
    };
  }

  return {
    decision: DECISIONS.APPROVE,
    reason: "RULES_PASSED",
    validation,
    risk
  };
}
