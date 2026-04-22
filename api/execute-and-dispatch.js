/**
 * EXECUTIA™ — /api/execute-and-dispatch.js
 *
 * Phase 1 (decision + commit) + Phase 2 (gateway dispatch).
 * Every response branch uses buildDispatchResponse() — guaranteed OpenAPI contract.
 *
 * SIMULATE (ALLOW_SIMULATE=true + simulate:true):
 *   Full decision evaluation, no commit, no ticket, no provider.
 *   Returns decision + SIMULATED status.
 *
 * LIVE:
 *   APPROVE + COMMITTED → issue ticket → dispatch → record result.
 *   BLOCK or ESCALATE   → commit only, no dispatch.
 */

import { normalizeEventInput,
         buildBaseContext,
         mergeEnrichment,
         assertCanonicalContext }     from "../engine/canonical-context.js";
import { assertRequiredContext }      from "../engine/required-context.js";
import { loadRules,
         filterScopedRules,
         sortRulesDeterministically } from "../engine/rule-loader.js";
import { evaluateRules }              from "../engine/rule-evaluator.js";
import { makeDecision }               from "../engine/decision-engine.js";
import { commitTruth }                from "../engine/commit-truth.js";
import { buildDispatchResponse }      from "../engine/dispatch-response-builder.js";
import { buildErrorResponse }         from "../engine/response-builder.js";
import { DECISION_STATES }            from "../engine/decision-states.js";
import { EXECUTION_STATUS }           from "../engine/execution-states.js";
import { issueExecutionTicket }       from "../gateway/ticket.js";
import { executeAction }              from "../gateway/execute-action.js";
import { getProvider, assertProviderAllowed, listProviders } from "../gateway/provider-registry.js";
import { withEngine }                 from "../middleware/with-engine.js";
import { createSupabaseAdmin }        from "../services/supabase-admin.js";
import { logAudit }                   from "../services/audit.js";

export default withEngine(async (req, res) => {
  const requestId = req.executia.requestId;
  const supabase  = createSupabaseAdmin();

  // Shared audit fields built up as we go
  let evaluatedRules = [];
  let invalidRules   = [];
  let ctx            = null;
  let rulesUsed      = [];

  function respond(status, params) {
    return res.status(status).json(buildDispatchResponse({
      evaluatedRules, invalidRules, context: ctx, rulesUsed,
      ticket: null, provider: null, executionResult: null,
      ...params,
    }));
  }

  // ── 1. NORMALIZE ───────────────────────────────────────────
  let event;
  try {
    event = normalizeEventInput({
      ...req.body,
      organizationId: req.executia.organizationId || req.body?.organizationId || null,
    });
  } catch (err) {
    return res.status(400).json(buildErrorResponse("INVALID_EVENT", err.message, null, requestId));
  }

  const isSimulate = event.simulate && process.env.ALLOW_SIMULATE === "true";

  const rawProvider = req.body.targetProvider || req.body.provider || process.env.DEFAULT_PROVIDER || null;
  if (!rawProvider) {
    return res.status(400).json(buildErrorResponse("PROVIDER_REQUIRED", `targetProvider/provider is required. Allowed providers: ${listProviders().join(", ")}`, null, requestId));
  }
  const targetProvider = rawProvider;
  let providerAdapter;
  try {
    assertProviderAllowed(targetProvider);
    providerAdapter = getProvider(targetProvider);
  } catch (err) {
    const code = err.message.startsWith("PROVIDER_FORBIDDEN") ? "PROVIDER_FORBIDDEN" : "UNKNOWN_PROVIDER";
    return res.status(400).json(buildErrorResponse(code, err.message, null, requestId));
  }

  // ── 2. BUILD + ENRICH CONTEXT ────────────────────────────────
  ctx = buildBaseContext(event);

  if (event.projectId) {
    try {
      const { data: project } = await supabase
        .from("projects").select("budget_remaining").eq("id", event.projectId).single();
      if (project?.budget_remaining != null)
        ctx = mergeEnrichment(ctx, { budgetRemaining: project.budget_remaining });
    } catch { }
  }

  if (req.body.contextOverrides && typeof req.body.contextOverrides === "object") {
    try {
      ctx = mergeEnrichment(ctx, req.body.contextOverrides);
    } catch (err) {
      return res.status(400).json(buildErrorResponse("UNKNOWN_CONTEXT_FIELD", err.message, null, requestId));
    }
  }

  // ── 3. ASSERT CONTEXT ────────────────────────────────────────
  try { assertCanonicalContext(ctx); }
  catch (err) { return res.status(500).json(buildErrorResponse("CANONICAL_CONTEXT_VIOLATION", err.message, null, requestId)); }

  try { assertRequiredContext(event.eventType, ctx); }
  catch (err) { return res.status(422).json(buildErrorResponse("MISSING_REQUIRED_CONTEXT", err.message, null, requestId)); }

  // ── 4. FETCH + EVALUATE RULES ────────────────────────────────
  let allRules;
  try {
    allRules = await loadRules(
      supabase, event.eventType, event.projectId, event.organizationId
    );
  } catch (err) {
    return res.status(500).json(buildErrorResponse("RULE_FETCH_FAILED", "Cannot load rules — decision aborted.", err.message, requestId));
  }

  const scopedRules = sortRulesDeterministically(
    filterScopedRules(allRules, {
      organizationId: event.organizationId,
      projectId:      event.projectId,
      eventType:      event.eventType,
    })
  );
  rulesUsed = scopedRules.map(r => ({ id: r.id, name: r.name, priority: r.priority, effect: r.effect }));

  ({ results: evaluatedRules, invalidRules } = evaluateRules(scopedRules, ctx));

  if (invalidRules.length > 0) {
    return res.status(500).json(buildErrorResponse("INVALID_PUBLISHED_RULE", `${invalidRules.length} published rule(s) failed validation.`, { invalid_rules: invalidRules }, requestId));
  }

  // ── 5. DECISION ──────────────────────────────────────────────
  const decisionResult = makeDecision(ctx, evaluatedRules);

  // ── 6. SIMULATE EARLY RETURN ─────────────────────────────────
  if (isSimulate) {
    return respond(200, {
      ok: true, simulation: true, requestId, decisionResult,
      commitResult: null,
      executionNote: "Simulation mode — no commit, no ticket, no provider call",
    });
  }

  // ── 7. COMMIT TRUTH ──────────────────────────────────────────
  const commitResult = await commitTruth({
    supabase, event, context: ctx, evaluatedRules, decisionResult, simulation: false,
  });

  if (!commitResult.ok) {
    await logAudit(supabase, { organization_id: event.organizationId, actor_type: "api_key", actor_id: req.executia?.auth?.keyId || null, actor_label: req.executia?.operatorEmail || null, action: "EXECUTION_COMMIT_FAILED", entity: "execution", entity_id: event.sessionId || null, status: "error", request_id: requestId, payload: { event_type: event.eventType, decision: decisionResult.decision, error: commitResult.error_message } });
    return res.status(500).json(buildDispatchResponse({
      ok: false, simulation: false, requestId, decisionResult, commitResult,
      evaluatedRules, invalidRules, context: ctx, rulesUsed,
      ticket: null, provider: null, executionResult: null,
    }));
  }

  // ── 8. GATE: APPROVE REQUIRED FOR DISPATCH ───────────────────
  if (decisionResult.decision !== "APPROVE") {
    return respond(200, {
      ok: true, simulation: false, requestId, decisionResult, commitResult,
      executionNote: `Execution not dispatched — decision is "${decisionResult.decision}"`,
    });
  }

  // ── 9. ISSUE TICKET ──────────────────────────────────────────
  let ticket;
  try {
    ticket = await issueExecutionTicket({
      supabase, commitResult, decisionResult, event,
      allowedAction: event.eventType,
      payload: { amount: event.amount, currency: event.currency, ...req.body.executionPayload },
    });
  } catch (err) {
    return res.status(500).json(buildDispatchResponse({
      ok: false, simulation: false, requestId, decisionResult, commitResult,
      evaluatedRules, invalidRules, context: ctx, rulesUsed,
      ticket: null, provider: targetProvider, executionResult: null,
      executionNote: `Ticket issue failed: ${err.message}`,
      commitResult: { ...commitResult, error_code: "TICKET_ISSUE_FAILED", error_message: err.message },
    }));
  }

  // ── 10. DISPATCH ─────────────────────────────────────────────
  let executionResult;
  try {
    executionResult = await executeAction({ supabase, ticket, providerAdapter });
  } catch (err) {
    // Only throws on EXECUTION_RESULT_UNRECORDED (critical)
    return res.status(500).json(buildDispatchResponse({
      ok: false, simulation: false, requestId, decisionResult, commitResult,
      evaluatedRules, invalidRules, context: ctx, rulesUsed,
      ticket, provider: targetProvider,
      executionResult: {
        execution_status: EXECUTION_STATUS.UNKNOWN_REQUIRES_RECONCILIATION,
        provider_status: "result_unrecorded",
        response_payload: { error: err.message },
        requires_reconciliation: true,
      },
    }));
  }

  // ── 11. RESPONSE ─────────────────────────────────────────────
  const { execution_status } = executionResult;

  // HTTP status reflects outcome semantics:
  //   200 = EXECUTED (provider confirmed)
  //   422 = PROVIDER_REJECTED (provider refused — bad input/logic, client should not retry blindly)
  //   500 = FAILED | UNKNOWN_REQUIRES_RECONCILIATION (server/provider error — retry or reconcile)
  const httpStatus =
    execution_status === EXECUTION_STATUS.EXECUTED          ? 200 :
    execution_status === EXECUTION_STATUS.PROVIDER_REJECTED ? 422 :
    500; // FAILED or UNKNOWN_REQUIRES_RECONCILIATION

  return res.status(httpStatus).json(buildDispatchResponse({
    ok: execution_status === EXECUTION_STATUS.EXECUTED, simulation: false, requestId, decisionResult, commitResult,
    evaluatedRules, invalidRules, context: ctx, rulesUsed,
    ticket, provider: targetProvider, executionResult,
  }));

}, { methods: ["POST"], requireAuth: true, rateLimit: true });
