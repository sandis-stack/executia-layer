/**
 * EXECUTIA™ — /governance/validate-generated-rule.js
 * AI-generated rules must pass the same strict validator the engine uses.
 * Same grammar. Same field dictionary. No exceptions.
 */

import { validateConditionSchema } from "../engine/strict-condition-engine.js";
import { RULE_EFFECTS }            from "../engine/rule-evaluator.js";

/**
 * @param {object} rule - AI-generated rule object
 * @returns {{ valid, errors, proposal_state }}
 */
export function validateGeneratedRule(rule) {
  const errors = [];

  if (!rule || typeof rule !== "object") {
    errors.push("rule must be an object");
    return { valid: false, errors, proposal_state: "invalid" };
  }

  if (!rule.id && !rule.rule_key) errors.push("missing id or rule_key");
  if (!rule.event_type)           errors.push("missing event_type");
  if (!rule.name)                 errors.push("missing name");

  if (!RULE_EFFECTS.includes(rule.effect)) {
    errors.push(`invalid effect "${rule.effect}" — must be one of: ${RULE_EFFECTS.join(", ")}`);
  }

  if (!("condition_json" in rule)) {
    errors.push("missing condition_json (use null for unconditional)");
  } else if (rule.condition_json !== null) {
    try {
      validateConditionSchema(rule.condition_json);
    } catch (err) {
      errors.push(err.message);
    }
  }

  const valid = errors.length === 0;
  return {
    valid,
    errors,
    proposal_state: valid ? "validated" : "invalid",
  };
}
