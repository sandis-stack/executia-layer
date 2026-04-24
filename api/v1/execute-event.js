/**
 * EXECUTIA™ — /api/execute-event.js
 *
 * Phase 1: evaluate event, commit decision to immutable ledger.
 * Does NOT dispatch to any provider — use /execute-and-dispatch for that.
 */

import { assertRuntimeReady, getRuntimeControlReport } from "../services/runtime-control.js";
import { applyCors } from "../services/cors.js";

import {
  normalizeEventInput,
  buildBaseContext,
  mergeEnrichment,
  assertCanonicalContext
} from "../engine/canonical-context.js";
import { assertRequiredContext } from "../engine/required-context.js";
import {
  loadRules,
  filterScopedRules,
  sortRulesDeterministically
} from "../engine/rule-loader.js";
import { evaluateRules } from "../engine/rule-evaluator.js";
import { makeDecision } from "../engine/decision-engine.js";
import { commitTruth } from "../engine/commit-truth.js";
import {
  buildExecutionResponse,
  buildErrorResponse
} from "../engine/response-builder.js";
import { DECISION_STATES } from "../engine/decision-states.js";
import { withEngine } from "../middleware/with-engine.js";
import { createSupabaseAdmin } from "../services/supabase-admin.js";
import { logAudit } from "../services/audit.js";

export default withEngine(async (req, res) => {
  if (applyCors(req, res, "POST,OPTIONS")) return;

  const requestId = req.executia.requestId;
  const supabase = createSupabaseAdmin();

  function err(status, code, message, detail = null) {
    return res.status(status).json(
      buildErrorResponse(code, message, detail, requestId)
    );
  }

  let runtimeReport;
  try {
    runtimeReport = await getRuntimeControlReport();
    await assertRuntimeReady();
  } catch (e) {
    return res.status(503).json({
      ok: false,
      status: e.code || "RUNTIME_BLOCKED",
      message: e.message,
      report: e.report || null,
    });
  }

  // ── 1. NORMALIZE ─────────────────────────────────────────────
  let event;
  try {
    event = normalizeEventInput({
      ...req.body,
      organizationId: req.executia.organizationId || req.body?.organizationId || null,
    });
  } catch (e) {
    return err(400, "INVALID_EVENT", e.message);
  }

  const isSimulate = event.simulate && process.env.ALLOW_SIMULATE === "true";

  // ── 2. BUILD CONTEXT ──────────────────────────────────────────
  let ctx = buildBaseContext(event);

  if (event.projectId) {
    try {
      const { data: project } = await supabase
        .from("projects")
        .select("budget_remaining")
        .eq("id", event.projectId)
        .single();

      if (project?.budget_remaining != null) {
        ctx = mergeEnrichment(ctx, { budgetRemaining: project.budget_remaining });
      }
    } catch {}
  }

  if (req.body.contextOverrides && typeof req.body.contextOverrides === "object") {
    try {
      ctx = mergeEnrichment(ctx, req.body.contextOverrides);
    } catch (e) {
      return err(400, "UNKNOWN_CONTEXT_FIELD", e.message);
    }
  }

  // ── 3. ASSERT CONTEXT ─────────────────────────────────────────
  try {
    assertCanonicalContext(ctx);
  } catch (e) {
    return err(500, "CANONICAL_CONTEXT_VIOLATION", e.message);
  }

  try {
    assertRequiredContext(event.eventType, ctx);
  } catch (e) {
    return err(422, "MISSING_REQUIRED_CONTEXT", e.message);
  }

  // ── 4. LOAD RULES — FAIL-CLOSED ───────────────────────────────
  let allRules;
  try {
    allRules = await loadRules(
      supabase,
      event.eventType,
      event.projectId,
      event.organizationId
    );
  } catch (e) {
    return err(
      500,
      "RULE_FETCH_FAILED",
      "Cannot load rules — decision aborted.",
      e.message
    );
  }

  const scopedRules = sortRulesDeterministically(
    filterScopedRules(allRules, {
      organizationId: event.organizationId,
      projectId: event.projectId,
      eventType: event.eventType,
    })
  );

  // ── 5. EVALUATE RULES — FAIL-CLOSED ───────────────────────────
  const { results: evaluatedRules, invalidRules } = evaluateRules(scopedRules, ctx);

  if (invalidRules.length > 0) {
    return err(
      500,
      "INVALID_PUBLISHED_RULE",
      `${invalidRules.length} published rule(s) failed validation. Execution aborted.`,
      { invalid_rules: invalidRules }
    );
  }

  // ── 6. DECIDE ────────────────────────────────────────────────
  const decisionResult = makeDecision(ctx, evaluatedRules);

  // ── 7. COMMIT — HARD FAIL ────────────────────────────────────
  const commitResult = await commitTruth({
    supabase,
    event,
    context: ctx,
    evaluatedRules,
    decisionResult,
    simulation: isSimulate,
  });

  if (!commitResult.ok) {
    await logAudit(supabase, {
      organization_id: event.organizationId,
      actor_type: "api_key",
      actor_id: req.executia?.auth?.keyId || null,
      actor_label: req.executia?.operatorEmail || null,
      action: "EXECUTION_DECISION_COMMIT_FAILED",
      entity: "execution",
      entity_id: event.sessionId || null,
      status: "error",
      request_id: requestId,
      payload: {
        event_type: event.eventType,
        decision: decisionResult.decision,
        reason_codes: decisionResult.reason_codes,
        error: commitResult.error_message,
        runtime_status: runtimeReport?.status || null,
        runtime_warnings: runtimeReport?.warnings || [],
      }
    });

    return res.status(500).json({
      ...buildErrorResponse(
        commitResult.error_code || "LEDGER_COMMIT_FAILED",
        commitResult.error_message || "Ledger write failed — decision not committed.",
        null,
        requestId
      ),
      decision: decisionResult.decision,
      decision_state: DECISION_STATES.DECIDED,
      commit_state: commitResult.commit_state,
      reason_codes: decisionResult.reason_codes,
      runtime: runtimeReport,
    });
  }

  await logAudit(supabase, {
    organization_id: event.organizationId,
    actor_type: "api_key",
    actor_id: req.executia?.auth?.keyId || null,
    actor_label: req.executia?.operatorEmail || null,
    action: "EXECUTION_DECIDED",
    entity: "ledger",
    entity_id: String(commitResult.ledger_id || ""),
    status: runtimeReport?.mode === "soft" ? "review" : "ok",
    request_id: requestId,
    payload: {
      event_type: event.eventType,
      decision: decisionResult.decision,
      truth_hash: commitResult.truth_hash,
      runtime_status: runtimeReport?.status || null,
      runtime_warnings: runtimeReport?.warnings || [],
    }
  });

  // ── 8. RESPOND ───────────────────────────────────────────────
  return res.status(200).json(
    buildExecutionResponse({
      commitResult,
      event,
      context: ctx,
      evaluatedRules,
      decisionResult,
      simulation: isSimulate,
      requestId,
      rulesUsed: scopedRules.map((r) => ({
        id: r.id,
        name: r.name,
        priority: r.priority,
        effect: r.effect,
      })),
      invalidRules,
      runtime: runtimeReport,
    })
  );

}, { methods: ["POST", "OPTIONS"], requireAuth: true, rateLimit: true });