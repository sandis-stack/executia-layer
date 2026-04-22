/**
 * EXECUTIA™ — /engine/rule-evaluator.js
 *
 * Pure evaluation: rules → RuleResult[].
 * NO board mutation. NO side effects. NO state change.
 *
 * Each rule is validated before evaluation.
 * Invalid rules are collected in invalidRules[] — not silently skipped.
 * Engine caller decides what to do with invalidRules (return to governance).
 */

import { validateConditionSchema, evaluateCondition } from "./strict-condition-engine.js";

export const RULE_EFFECTS = Object.freeze(["ALLOW", "ESCALATE", "BLOCK"]);

/**
 * Validate a single rule object structure.
 * Throws on invalid — engine must never evaluate a structurally invalid rule.
 */
export function validateRuleObject(rule) {
  if (!rule || typeof rule !== "object") {
    throw new Error("INVALID_RULE: rule must be an object");
  }
  if (!rule.id) {
    throw new Error("INVALID_RULE: missing id");
  }
  if (!rule.name && !rule.rule_key) {
    throw new Error("INVALID_RULE: missing name or rule_key");
  }
  if (!RULE_EFFECTS.includes(rule.effect)) {
    throw new Error(`INVALID_RULE_EFFECT:${rule.effect}`);
  }
  // condition_json null = always match — valid
  if (rule.condition_json !== null) {
    validateConditionSchema(rule.condition_json);
  }
  return true;
}

/**
 * Evaluate all rules against canonical context.
 * Returns { results, invalidRules } — never throws.
 *
 * @param {object[]} rules - Scoped, sorted, published rules
 * @param {object}   ctx   - Canonical context (assertCanonicalContext already passed)
 * @returns {{ results: RuleResult[], invalidRules: object[] }}
 */
export function evaluateRules(rules, ctx) {
  const results      = [];
  const invalidRules = [];

  for (const rule of rules) {
    // Validate structure — invalid rules go to governance, not engine
    try {
      validateRuleObject(rule);
    } catch (err) {
      invalidRules.push({
        rule_id:    rule.id,
        rule_name:  rule.name || rule.rule_key,
        error_code: "INVALID_RULE_SCHEMA",
        error:      err.message,
      });
      continue;
    }

    // Evaluate condition
    let matched = false;
    try {
      matched = rule.condition_json === null
        ? true   // null condition = unconditional match
        : evaluateCondition(rule.condition_json, ctx);
    } catch (err) {
      invalidRules.push({
        rule_id:    rule.id,
        rule_name:  rule.name || rule.rule_key,
        error_code: "RULE_EVALUATION_ERROR",
        error:      err.message,
      });
      continue;
    }

    results.push({
      rule_id:   rule.id,
      rule_name: rule.name || rule.rule_key,
      effect:    rule.effect,
      priority:  Number(rule.priority ?? 100),
      matched,
    });
  }

  return { results, invalidRules };
}
