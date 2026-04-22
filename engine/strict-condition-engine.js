/**
 * EXECUTIA™ — /engine/strict-condition-engine.js
 *
 * STRICT CONDITION ENGINE. No aliases. No fallbacks. No interpretation.
 *
 * Grammar:
 *   condition := composite | leaf
 *   composite := { "all": [condition, ...] }  — AND
 *              | { "any": [condition, ...] }  — OR
 *              | { "not": condition }          — NOT
 *   leaf      := { "field": string, "op": operator, "value": any }
 *
 * Operators: eq | neq | gt | gte | lt | lte | in | not_in | is_null | is_not_null
 * Fields:    must be in CANONICAL_FIELDS — throws immediately otherwise
 *
 * validateConditionSchema() throws on ANY violation.
 * evaluateCondition() pre-condition: schema already validated.
 */

import { assertKnownField } from "./canonical-context.js";

export const ALLOWED_OPERATORS = Object.freeze([
  "eq", "neq", "gt", "gte", "lt", "lte",
  "in", "not_in", "is_null", "is_not_null",
]);

function isObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function isLeaf(node) {
  return isObject(node) && typeof node.field === "string" && typeof node.op === "string";
}

// ── VALIDATOR ─────────────────────────────────────────────────

/**
 * Validate a condition node strictly.
 * Throws Error on first violation — no partial validation.
 * @param {object} node
 * @param {string} [path="$"]
 */
export function validateConditionSchema(node, path = "$") {
  if (!isObject(node)) {
    throw new Error(`INVALID_RULE_SCHEMA: ${path} — condition must be a plain object`);
  }

  // Detect and reject deprecated syntax immediately
  if (typeof node.op === "string" && ["AND", "OR", "NOT"].includes(node.op)) {
    throw new Error(
      `INVALID_RULE_SCHEMA: ${path} — deprecated op "${node.op}". ` +
      `Use "all", "any", or "not" instead.`
    );
  }
  if ("conditions" in node) {
    throw new Error(`INVALID_RULE_SCHEMA: ${path} — key "conditions" not allowed. Use "all" or "any".`);
  }

  // Composite: all
  if ("all" in node) {
    if (!Array.isArray(node.all) || node.all.length === 0) {
      throw new Error(`INVALID_RULE_SCHEMA: ${path}.all — must be non-empty array`);
    }
    node.all.forEach((child, i) => validateConditionSchema(child, `${path}.all[${i}]`));
    return true;
  }

  // Composite: any
  if ("any" in node) {
    if (!Array.isArray(node.any) || node.any.length === 0) {
      throw new Error(`INVALID_RULE_SCHEMA: ${path}.any — must be non-empty array`);
    }
    node.any.forEach((child, i) => validateConditionSchema(child, `${path}.any[${i}]`));
    return true;
  }

  // Composite: not
  if ("not" in node) {
    if (!isObject(node.not)) {
      throw new Error(`INVALID_RULE_SCHEMA: ${path}.not — must be a condition object`);
    }
    validateConditionSchema(node.not, `${path}.not`);
    return true;
  }

  // Leaf node
  if (isLeaf(node)) {
    assertKnownField(node.field);   // throws UNKNOWN_CONTEXT_FIELD

    if (!ALLOWED_OPERATORS.includes(node.op)) {
      throw new Error(`UNSUPPORTED_OPERATOR:${node.op} at ${path}`);
    }

    const isNullOp = node.op === "is_null" || node.op === "is_not_null";
    if (!isNullOp && !Object.prototype.hasOwnProperty.call(node, "value")) {
      throw new Error(`INVALID_RULE_SCHEMA: ${path} — operator "${node.op}" requires "value"`);
    }

    return true;
  }

  // Unknown structure
  throw new Error(`INVALID_RULE_SCHEMA: ${path} — unrecognized node. Must be all/any/not or leaf {field, op, value}`);
}

// ── EVALUATOR ─────────────────────────────────────────────────

/**
 * Evaluate a validated condition against canonical context.
 * Pre-condition: validateConditionSchema passed without error.
 * @param {object} node
 * @param {object} ctx  - Canonical context (all fields known)
 * @returns {boolean}
 */
export function evaluateCondition(node, ctx) {
  if (node.all) return node.all.every(child => evaluateCondition(child, ctx));
  if (node.any) return node.any.some(child  => evaluateCondition(child, ctx));
  if (node.not) return !evaluateCondition(node.not, ctx);

  assertKnownField(node.field);
  const actual = ctx[node.field];
  return compare(actual, node.op, node.value);
}

function compare(actual, op, expected) {
  switch (op) {
    case "eq":       return actual === expected;
    case "neq":      return actual !== expected;
    case "gt":       return Number(actual) >  Number(expected);
    case "gte":      return Number(actual) >= Number(expected);
    case "lt":       return Number(actual) <  Number(expected);
    case "lte":      return Number(actual) <= Number(expected);
    case "in":       return Array.isArray(expected) && expected.includes(actual);
    case "not_in":   return Array.isArray(expected) && !expected.includes(actual);
    case "is_null":     return actual == null;
    case "is_not_null": return actual != null;
    default:         throw new Error(`UNSUPPORTED_OPERATOR:${op}`);
  }
}
