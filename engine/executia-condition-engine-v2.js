/**
 * EXECUTIA™ — executia-condition-engine-v2.js
 * Core condition evaluation, compliance, context, and ledger hashing.
 *
 * Exports:
 *   evaluateCondition(condition, ctx)      → boolean
 *   buildProjectContext(base, tasks, over) → ctx object
 *   runCompliance(countryCode, ctx, rules) → compliance result
 *   applyComplianceToBoard(tasks, comp)    → filtered task array
 *   hashLedgerEntry(entry)                 → Promise<SHA-256 hex>
 */

import crypto from "crypto";

// ════════════════════════════════════════════════════════════════
// 1. CONDITION EVALUATOR
//    Mirrors SQL evaluate_condition() in executia-schema-v2.sql
//    condition_json: { field, op, value } | { all } | { any } | { not } | { also }
// ════════════════════════════════════════════════════════════════

export function evaluateCondition(condition, ctx) {
  if (!condition || typeof condition !== "object") return true;

  // OR / ANY
  if (Array.isArray(condition.any))
    return condition.any.some(c => evaluateCondition(c, ctx));

  // AND / ALL
  if (Array.isArray(condition.all))
    return condition.all.every(c => evaluateCondition(c, ctx));

  // NOT
  if (condition.not !== undefined)
    return !evaluateCondition(condition.not, ctx);

  // Simple comparison
  const { field, op, value } = condition;
  if (!field || !op) {
    console.warn("[EXECUTIA] evaluateCondition: missing field/op", condition);
    return false;
  }

  const ctxVal = _getField(field, ctx);
  let   result = _compare(ctxVal, op, value);

  // Compound AND shorthand: { field, op, value, also: condition }
  if (result && condition.also !== undefined)
    result = evaluateCondition(condition.also, ctx);

  return result;
}

function _getField(field, ctx) {
  if (!field.includes(".")) return ctx[field];
  return field.split(".").reduce((o, k) => o == null ? undefined : o[k], ctx);
}

function _compare(actual, op, expected) {
  // Boolean shorthand
  if (typeof expected === "boolean") {
    const b = actual === true || actual === "true" || actual === 1;
    if (op === "===" || op === "==") return b === expected;
    if (op === "!==" || op === "!=") return b !== expected;
  }

  const nA = Number(actual);
  const nE = Number(expected);
  const num = !isNaN(nA) && !isNaN(nE);

  switch (op) {
    case ">":   return num ? nA >  nE : String(actual) >  String(expected);
    case "<":   return num ? nA <  nE : String(actual) <  String(expected);
    case ">=":  return num ? nA >= nE : String(actual) >= String(expected);
    case "<=":  return num ? nA <= nE : String(actual) <= String(expected);
    case "===": return actual === expected;
    case "!==": return actual !== expected;
    case "==":  return num ? nA === nE : String(actual) === String(expected);
    case "!=":  return num ? nA !== nE : String(actual) !== String(expected);
    default:
      console.warn("[EXECUTIA] unknown operator:", op);
      return false;
  }
}


// ════════════════════════════════════════════════════════════════
// 2. CONTEXT BUILDER
//    Canonical project context from task board + overrides
// ════════════════════════════════════════════════════════════════

export function buildProjectContext(base = {}, tasks = [], overrides = {}) {
  const T = Array.isArray(tasks) ? tasks : [];

  const blockedTasks     = T.filter(t => t.status === "blocked").length;
  const criticalTasks    = T.filter(t => t.priority === "P1").length;
  const alternativeTasks = T.filter(t => t.status === "do_now" && t.priority !== "P1").length;
  const completedTasks   = T.filter(t => t.status === "done").length;
  const totalTasks       = T.length;

  return {
    // Derived from task board
    blockedTasks,
    criticalTasks,
    alternativeTasks,
    completedTasks,
    pendingTasks:    T.filter(t => t.status === "waiting").length,
    totalTasks,
    completionRate:  totalTasks > 0 ? Math.round(completedTasks / totalTasks * 100) : 0,
    deadlinePressure: blockedTasks > Math.max(1, totalTasks * 0.5) || criticalTasks > 3,

    // Defaults — overridden by realDataAdapter or request
    workersAvailable:            1,
    workHours:                   8,
    hoursSinceRest:              8,
    height:                      0,
    safetyBarrier:               true,
    ppeVerified:                 true,
    concretePoured:              false,
    hoursElapsed:                25,
    scaffoldDaysSinceInspection: 0,
    supervisorPresent:           true,
    temperature:                 20,
    windSpeed:                   0,
    visibility:                  1000,
    budgetRemaining:             null,
    daysRemaining:               null,

    // Merge order: base → task-derived → overrides (overrides win)
    ...base,
    blockedTasks,     // task-derived always recalculated
    criticalTasks,
    alternativeTasks,
    ...overrides,
  };
}


// ════════════════════════════════════════════════════════════════
// 3. COMPLIANCE ENGINE
//    Evaluates law_rules against context
// ════════════════════════════════════════════════════════════════

const SEV = { HIGH: 3, MEDIUM: 2, LOW: 1 };

export function runCompliance(countryCode, ctx, rules = []) {
  const violations = [];
  let fineTotal = 0;

  for (const rule of rules) {
    // Country guard (DB pre-filters, but double-check)
    if (rule.country_code && rule.country_code !== countryCode) continue;
    // Expired law guard
    if (rule.laws?.valid_to && new Date(rule.laws.valid_to) < new Date()) continue;

    let triggered = false;
    try {
      triggered = evaluateCondition(rule.condition_json, ctx);
    } catch (e) {
      console.warn(`[EXECUTIA] compliance rule ${rule.rule_key} eval error:`, e.message);
      continue;
    }
    if (!triggered) continue;

    const fine = Number(rule.fine_eur) || 0;
    fineTotal += fine;
    violations.push({
      rule_key:   rule.rule_key,
      law_name:   rule.law_name || rule.laws?.name || "Unknown law",
      message:    rule.message,
      action:     rule.action,
      severity:   rule.severity,
      fine_eur:   fine,
      blocksTask: rule.blocks_task === true || rule.blocks_task === 1,
    });
  }

  if (!violations.length) {
    return { allowed: true, blocksTask: false, violations: [], worst: null, score: 100, fineTotal: 0 };
  }

  const sorted  = [...violations].sort((a, b) =>
    (SEV[b.severity] || 0) - (SEV[a.severity] || 0) || b.fine_eur - a.fine_eur
  );
  const worst    = sorted[0];
  const hasBlock = violations.some(v => v.blocksTask);
  const score    = Math.max(0, Math.round(Math.min(100, 100 - violations.length * 15 - fineTotal / 500)));

  return { allowed: !hasBlock, blocksTask: hasBlock, violations, worst, score, fineTotal };
}


// ════════════════════════════════════════════════════════════════
// 4. COMPLIANCE BOARD APPLIER
//    Blocks tasks and injects compliance intervention task
// ════════════════════════════════════════════════════════════════

export function applyComplianceToBoard(tasks, compliance) {
  if (!compliance || compliance.allowed !== false) return tasks;

  const worst   = compliance.worst;
  const message = worst?.message || "Compliance violation — work halted";
  const action  = worst?.action  || "Resolve compliance issue before continuing";

  const updated = tasks.map(t =>
    t.status === "do_now"
      ? { ...t, status: "blocked", reason: message, action, priority: "P1",
          blockedBy: "compliance", law: worst?.law_name || null, fine_eur: worst?.fine_eur || null }
      : t
  );

  const taskId = `compliance_${worst?.rule_key || "violation"}`;
  if (!updated.some(t => t.id === taskId)) {
    updated.push({
      id: taskId,
      title:    `⚠ Compliance: ${worst?.law_name || "Violation"}`,
      status:   "do_now",
      priority: "P1",
      reason:   message,
      action,
      severity: worst?.severity || "HIGH",
      fine_eur: worst?.fine_eur || 0,
      blockedBy:"compliance",
    });
  }

  return updated;
}


// ════════════════════════════════════════════════════════════════
// 5. LEDGER HASH — SHA-256
//    Canonical entry hash for tamper-proof chain
// ════════════════════════════════════════════════════════════════

export async function hashLedgerEntry(entry) {
  // Canonical subset — deterministic, excludes snapshots and floats
  // ts must be provided by caller (entry.ts) for reproducible hashes.
  // If missing, falls back to now() — but that breaks auditability.
  const canonical = {
    session_id:   entry.session_id   ?? null,
    project_id:   entry.project_id   ?? null,
    event_type:   entry.event_type   ?? null,
    decision:     _canonicalDecision(entry.decision),
    cause:        entry.cause        ?? null,
    outcome:      entry.outcome      ?? null,
    strategy:     entry.strategy     ?? null,
    risk_level:   entry.risk_level   ?? null,
    money_impact: entry.money_impact ?? null,
    prev_hash:    entry.prev_hash    ?? null,
    ts:           entry.ts           ?? new Date().toISOString(),
  };

  // Sort keys for determinism
  const payload = JSON.stringify(canonical, Object.keys(canonical).sort());

  return new Promise((res, rej) => {
    try {
      res(crypto.createHash("sha256").update(payload, "utf8").digest("hex"));
    } catch (e) {
      rej(new Error("[EXECUTIA] hashLedgerEntry: " + e.message));
    }
  });
}

function _canonicalDecision(d) {
  if (!d) return null;
  if (typeof d === "string") return d;
  return { status: d.status ?? null, cause: d.cause ?? null, rule: d.rule ?? null };
}
