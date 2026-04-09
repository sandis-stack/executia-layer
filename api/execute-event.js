/**
 * EXECUTIA™ — /api/execute-event
 * The single engine brain. UI sends event, gets back full decision.
 *
 * POST /api/execute-event
 * Body: { sessionId, projectId, eventType, tasksBefore, contextOverrides? }
 *
 * Response: { tasks, compliance, decision, risk, money, why, diff, hash }
 */

import { createClient } from "@supabase/supabase-js";
import {
  evaluateCondition,
  runCompliance,
  applyComplianceToBoard,
  buildProjectContext,
  hashLedgerEntry,
} from "../lib/executia-condition-engine-v2.js";
import { loadExecutionRules }          from "../core/rules/ruleLoader.js";
import { applyExecutionRules }         from "../core/rules/ruleEngine.js";
import { resolveConflicts }            from "../core/engine/conflictResolver.js";
import { enrichContextWithRealData }   from "../core/context/realDataAdapter.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY   // service role — bypasses RLS for engine writes
);

// ── COST MODEL (Norway baseline) ────────────────────────────
const COSTS = {
  worker_hour:    65,
  idle_hour:      45,
  delay_penalty: 120,
  task_value:    500,
  margin_rate:  0.18,   // 18% margin on value generated
};

// ── RULE ENGINE — DB-DRIVEN (replaces hardcoded RULES map) ──
// Rules loaded from Supabase execution_rules table at runtime.
// Fallback rules activate if DB unavailable (see ruleLoader.js).
// To add/modify rules: INSERT INTO execution_rules ... (no deploy needed)

// ── WHY ENGINE ───────────────────────────────────────────────
const VOICE = {
  material_delayed:   "Crew reassigned. Work continues.",
  worker_unavailable: "Work paused. Replacement required.",
  task_completed:     "Next phase started.",
  crew_available:     "Work resumed.",
  delay_detected:     "Delay escalated.",
};

function getWhy(type, ctx) {
  const alt = ctx.alternativeTasks ?? 1;
  const wrk = ctx.workersAvailable ?? 1;

  if (type === "material_delayed") return alt > 0
    ? { cause:"Material missing", rule:"Avoid idle workforce", decision:"Reassign crew to available task", outcome:"Work continues without delay" }
    : { cause:"Material missing — no alternatives", rule:"No executable tasks", decision:"Work paused", outcome:"Idle time unavoidable" };

  if (type === "worker_unavailable") return wrk > 1
    ? { cause:"Partial workforce available", rule:"Redistribute workload", decision:"Reassign remaining workers", outcome:"Execution at reduced capacity" }
    : { cause:"No workers available", rule:"Execution requires workforce", decision:"Task halted", outcome:"Replacement required" };

  if (type === "task_completed")  return { cause:"Dependency resolved",        rule:"Unlock next task",            decision:"Next phase started",                    outcome:"Continuous workflow" };
  if (type === "crew_available")  return { cause:"Idle crew detected",         rule:"Idle resources must be used", decision:"Assign to highest priority task",        outcome:"Resource utilization maximized" };
  if (type === "delay_detected")  return wrk > 0
    ? { cause:"Task overdue — resources present", rule:"Overdue + resource = escalate", decision:"Escalate + raise priority", outcome:"SLA breach prevented" }
    : { cause:"Task overdue — no resources",      rule:"Overdue + no resource = critical", decision:"Emergency escalation", outcome:"SLA breach likely" };

  return { cause:"System event", rule:"Default rule", decision:"No action", outcome:"No change" };
}

function applyStrategy(why, ctx, strategy) {
  // Extended strategy: TIME / COST / RISK / LEGAL / CASHFLOW
  if (strategy === "TIME" && ctx.alternativeTasks > 0) {
    why.decision = "Reassign immediately"; why.outcome = "Delay minimized";
  }
  if (strategy === "COST" && ctx.blockedTasks > 0) {
    why.decision = "Wait for optimal resource"; why.outcome = "Cost efficiency maintained";
  }
  return why;
}

// ── RISK ENGINE ──────────────────────────────────────────────
function getRisk(ctx) {
  let score = ctx.blockedTasks * 2 + ctx.criticalTasks * 3;
  if (ctx.workersAvailable === 0) score += 5;
  if (ctx.deadlinePressure)       score += 2;
  if (score >= 8) return { level:"HIGH",   color:"#DC2626" };
  if (score >= 4) return { level:"MEDIUM", color:"#D97706" };
  return              { level:"LOW",    color:"#16A34A" };
}

// ── MONEY ENGINE ─────────────────────────────────────────────
function getMoney(type, ctx) {
  const w = Math.max(ctx.workersAvailable, 1);
  const impacts = {
    material_delayed:   { impact: Math.round(w * COSTS.idle_hour),          label:`Idle cost avoided (€${COSTS.idle_hour}/worker)` },
    worker_unavailable: { impact: -Math.round(w * COSTS.worker_hour * 3),   label:"3h productivity loss" },
    task_completed:     { impact: COSTS.task_value,                          label:"Progress value created" },
    delay_detected:     { impact: -COSTS.delay_penalty,                      label:"Delay penalty risk/h" },
    crew_available:     { impact: Math.round(w * COSTS.worker_hour),         label:"Capacity activated" },
  };
  const m = impacts[type] || { impact: 0, label:"" };
  return {
    ...m,
    margin: Math.round(m.impact * COSTS.margin_rate),
    label:  m.label,
  };
}

// ── DIFF ─────────────────────────────────────────────────────
function getDiff(before, after) {
  const changes = [];
  after.forEach(a => {
    const b = before.find(x => x.id === a.id);
    if (b && b.status !== a.status) changes.push(`${a.title}: ${b.status} → ${a.status}`);
  });
  after.filter(a => !before.find(x => x.id === a.id))
       .forEach(a => changes.push(`+ ${a.title}: ${a.status}`));
  return changes;
}

// ── MAIN HANDLER ─────────────────────────────────────────────
export default async function handler(req, res) {
  // ── API KEY AUTH ─────────────────────────────────────────
  const apiKey = req.headers["x-api-key"];
  const validKey = process.env.EXECUTIA_API_KEY;
  if (validKey && apiKey !== validKey) {
    return res.status(401).json({ error: "Unauthorized", code: "INVALID_API_KEY" });
  }
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")    return res.status(405).json({ error: "Method not allowed" });

  const {
    sessionId,
    projectId,
    eventType,
    tasksBefore    = [],
    contextOverrides = {},
    strategy       = "TIME",
    countryCode    = "NO",
  } = req.body;

  const orgId = req.headers["x-org-id"] || null;
  const normalizedEvent = eventType.toLowerCase().replace(/[- ]/g, "_");

  // Fix #7 — extended input validation
  if (!sessionId || !eventType) {
    return res.status(400).json({ error: "sessionId and eventType required" });
  }
  if (!Array.isArray(tasksBefore)) {
    return res.status(400).json({ error: "tasksBefore must be array" });
  }
  if (typeof eventType !== "string") {
    return res.status(400).json({ error: "eventType must be string" });
  }

  try {
    // 1. Load rules from DB — fix #4 safe fallback
    let dbRules = [];
    try {
      dbRules = await loadExecutionRules(supabase, normalizedEvent, projectId, orgId);
    } catch (e) {
      console.warn("[EXECUTIA] rules load failed, using fallback:", e.message);
    }

    // 2. Apply rules → get updated tasks + which rules fired
    const { tasks: tasksRaw, rulesApplied } = applyExecutionRules(
      tasksBefore.map(t => ({ ...t })),
      dbRules,
      { eventType: normalizedEvent },  // pre-ctx for condition evaluation
      sessionId
    );

    // 3. Build full context
    const ctxBase = buildProjectContext({}, tasksRaw, {
      ...contextOverrides,
      height:                      contextOverrides.height                      ?? 0,
      safetyBarrier:               contextOverrides.safetyBarrier               ?? true,
      workHours:                   contextOverrides.workHours                   ?? 8,
      hoursSinceRest:              contextOverrides.hoursSinceRest              ?? 8,
      ppeVerified:                 contextOverrides.ppeVerified                 ?? true,
      concretePoured:              contextOverrides.concretePoured              ?? false,
      hoursElapsed:                contextOverrides.hoursElapsed                ?? 25,
      scaffoldDaysSinceInspection: contextOverrides.scaffoldDaysSinceInspection ?? 0,
    });

    // 3b. Enrich with real data — fix #3 safe fallback
    let ctx = ctxBase;
    try {
      ctx = await enrichContextWithRealData(ctxBase, projectId, {
        supabase,
        timesheetUrl: process.env.TIMESHEET_API || null,
        sensorUrl:    process.env.SENSOR_API    || null,
        bimUrl:       process.env.BIM_API       || null,
      });
    } catch (e) {
      console.warn("[EXECUTIA] context enrichment failed, using base:", e.message);
    }

    // 4. Resolve conflicts — safe rulesApplied guard
    const safeRules = Array.isArray(rulesApplied) ? rulesApplied : [];
    const tasksAfter = resolveConflicts(tasksBefore, safeRules, ctx, strategy);

    // 3. Fetch law rules from DB — fix #2 org isolation
    let lawQuery = supabase
      .from("law_rules")
      .select(`id, rule_key, condition_json, action, severity, message, fine_eur, blocks_task, laws(name, country_code, valid_to)`)
      .eq("laws.country_code", countryCode);
    if (orgId) lawQuery = lawQuery.eq("organization_id", orgId);
    const { data: lawRules, error: lawErr } = await lawQuery;

    const rules = (lawErr || !lawRules)
      ? []
      : lawRules.map(r => ({ ...r, country_code: r.laws?.country_code, law_name: r.laws?.name }));

    // 4. Compliance check
    let compliance = runCompliance(countryCode, ctx, rules);

    // 5. Apply compliance to board (blocks illegal work)
    let finalTasks = [...tasksAfter];
    if (!compliance.allowed && compliance.blocksTask) {
      finalTasks = applyComplianceToBoard(finalTasks, compliance);
    }

    // 6. Decision + risk + money
    let why   = getWhy(normalizedEvent, ctx);
        why   = applyStrategy(why, ctx, strategy);
    const risk  = getRisk(ctx);
    const money = getMoney(normalizedEvent, ctx);
    const diff  = getDiff(tasksBefore, finalTasks);

    // 7. Build + hash ledger entry
    const decisionStatus = compliance.allowed === false ? "BLOCKED"
                         : risk.level === "HIGH"        ? "REQUIRES_REVIEW"
                         :                               "APPROVED";

    const entry = {
      session_id:       sessionId,
      project_id:       projectId || null,
      event_type:       normalizedEvent.toUpperCase().replace(/_/g, " "),
      detail:           why.decision,
      rule_applied:     why.rule,
      decision: {
        ...why,
        status: decisionStatus,      // ← KPI trigger uses decision->>'status'
      },
      cause:            why.cause,
      outcome:          why.outcome,
      strategy,
      risk_level:       risk.level,
      money_impact:     money.impact,
      money_label:      money.label,
      margin_impact:    money.margin,
      compliance:       compliance.worst
        ? { allowed: compliance.allowed, law: compliance.worst.law_name, severity: compliance.worst.severity, fine_eur: compliance.worst.fine_eur, score: compliance.score, fine_total: compliance.fineTotal }
        : { allowed: true, score: 100 },
      tasks_before:     tasksBefore,
      tasks_after:      finalTasks,
      context_snapshot: ctx,
    };

    // get prev hash — fix #6 no .single() crash
    const { data: prev } = await supabase
      .from("events")
      .select("hash")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(1);

    entry.prev_hash = prev?.[0]?.hash || null;
    const hash = await hashLedgerEntry(entry);

    // ── SIMULATE MODE — preview only, no ledger write ──────────
    if (req.body.simulate) {
      return res.status(200).json({
        simulated: true, ok: true,
        tasks: finalTasks, diff,
        decision: why, risk, money,
        compliance: { ...compliance },
        hash: "(simulation — not written)",
        note: "Simulation mode — ledger write skipped"
      });
    }

    // 8. Write to ledger — fix #5 safe write
    try {
      await supabase.from("events").insert({ ...entry, hash });
    } catch (e) {
      console.warn("[EXECUTIA] ledger write failed:", e.message);
    }

    // 9. Return full decision to UI
    return res.status(200).json({
      ok:         true,
      tasks:      finalTasks,
      compliance: { ...compliance, worst: compliance.worst ? { ...compliance.worst } : null },
      decision:   { ...why, status: decisionStatus },
      risk,
      money,
      diff,
      voice:      VOICE[normalizedEvent] || why.decision,
      hash,
    });

  } catch (err) {
    console.error("[EXECUTIA] execute-event error:", err);
    return res.status(500).json({ error: "Engine error", detail: err.message });
  }
}
