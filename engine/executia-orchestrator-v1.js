/**
 * EXECUTIA™ — Execution Orchestrator v1
 * Connects condition engine, context, compliance, board, and ledger.
 *
 * Usage:
 *   const result = await evaluateExecution({ tasks, rules, country, overrides, ... });
 *
 * Input:
 *   tasks      Array   - current task board
 *   rules      Array   - law_rules rows from DB (pre-fetched by caller)
 *   country    string  - country code e.g. "NO", "LV"
 *   overrides  object  - context overrides (height, workHours, etc.)
 *   base       object  - base context to merge
 *   sessionId  string  - for ledger chain
 *   projectId  string  - for ledger chain
 *   prevHash   string  - SHA-256 of previous ledger entry (chain link)
 *
 * Output:
 *   { ok, verdict, compliance, context, tasks, trace, ledger: { entry, hash } }
 *   { ok:false, error } on failure
 */

import {
  evaluateCondition,
  buildProjectContext,
  runCompliance,
  applyComplianceToBoard,
  hashLedgerEntry,
} from "./executia-condition-engine-v2.js";

// ── THRESHOLDS ────────────────────────────────────────────────
const REVIEW_THRESHOLD = 60;  // compliance score below this → REQUIRES_REVIEW

// ── VERDICT RESOLVER ─────────────────────────────────────────
function resolveVerdict(compliance, ctx) {
  if (compliance.blocksTask)                      return "BLOCKED";
  if (compliance.score < REVIEW_THRESHOLD)        return "REQUIRES_REVIEW";
  if (ctx.deadlinePressure && ctx.blockedTasks > 0) return "REQUIRES_REVIEW";
  return "APPROVED";
}

// ── TRACE BUILDER ─────────────────────────────────────────────
function buildTrace(ctx, compliance, verdict) {
  const ts = new Date().toISOString();
  const trace = [
    {
      ts,
      event: "context_built",
      note:  `tasks=${ctx.totalTasks}, blocked=${ctx.blockedTasks}, completion=${ctx.completionRate}%`,
    },
    {
      ts,
      event: "compliance_evaluated",
      note:  `${compliance.violations.length} violation(s), score=${compliance.score}, fineTotal=€${compliance.fineTotal}`,
    },
    {
      ts,
      event: "verdict_resolved",
      note:  verdict,
    },
  ];

  if (compliance.worst) {
    trace.push({
      ts,
      event: "critical_violation",
      note:  `${compliance.worst.rule_key} — ${compliance.worst.message} (${compliance.worst.severity}, €${compliance.worst.fine_eur})`,
    });
  }

  if (compliance.violations.length > 1) {
    trace.push({
      ts,
      event: "additional_violations",
      note:  compliance.violations.slice(1).map(v => v.rule_key).join(", "),
    });
  }

  return trace;
}

// ── MAIN ENGINE ───────────────────────────────────────────────
export async function evaluateExecution(input = {}) {
  // Input validation
  if (!input || typeof input !== "object") {
    return { ok: false, error: "input must be an object" };
  }

  const tasks    = Array.isArray(input.tasks)   ? input.tasks   : [];
  const rules    = Array.isArray(input.rules)   ? input.rules   : [];
  const country  = typeof input.country === "string" ? input.country.toUpperCase() : "EU";
  const overrides= typeof input.overrides === "object" && input.overrides ? input.overrides : {};
  const base     = typeof input.base === "object" && input.base ? input.base : {};

  try {
    // 1. Build context from task board + overrides
    const ctx = buildProjectContext(base, tasks, overrides);

    // 2. Evaluate compliance rules
    const compliance = runCompliance(country, ctx, rules);

    // 3. Resolve verdict
    const verdict = resolveVerdict(compliance, ctx);

    // 4. Apply compliance blocks to task board
    const updatedTasks = applyComplianceToBoard(tasks, compliance);

    // 5. Build execution trace
    const trace = buildTrace(ctx, compliance, verdict);

    // 6. Build canonical ledger entry
    // ts is fixed at evaluation time — passed into hash for determinism.
    // Same input + same ts = same hash (verifiable, reproducible).
    const ts = input.ts || new Date().toISOString();
    const ledgerEntry = {
      session_id:   input.sessionId  || null,
      project_id:   input.projectId  || null,
      event_type:   "EXECUTION_EVALUATION",
      decision:     { status: verdict },
      cause:        compliance.worst?.rule_key || null,
      outcome:      verdict,
      strategy:     input.strategy   || null,
      risk_level:   compliance.blocksTask ? "HIGH" : compliance.score < 60 ? "MEDIUM" : "LOW",
      money_impact: compliance.fineTotal || 0,
      prev_hash:    input.prevHash   || null,
      ts,
    };

    const hash = await hashLedgerEntry(ledgerEntry);

    return {
      ok:         true,
      verdict,

      // Top-level control surface — clear for frontend, AI, and operator
      control: {
        allowed:    compliance.allowed,
        blocks:     compliance.blocksTask,
        score:      compliance.score,
        fineTotal:  compliance.fineTotal,
        riskLevel:  ledgerEntry.risk_level,
      },

      compliance,
      context:    ctx,
      tasks:      updatedTasks,
      trace,
      ledger: {
        entry: ledgerEntry,
        hash,
      },
    };

  } catch (err) {
    console.error("[EXECUTIA] orchestrator error:", err);
    return { ok: false, error: err.message || "Execution evaluation failed" };
  }
}
