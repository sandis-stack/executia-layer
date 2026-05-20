/**
 * EXECUTIA Execution Service
 *
 * TRUTH MODEL:
 *   createExecution()        → DB RPC commit_execution() — atomic
 *   applyOperatorDecision()  → DB RPC commit_operator_decision() — atomic
 *   listExecutions()         → read-only
 *   listPendingReview()      → read-only, PENDING_REVIEW only
 *
 * Browser NEVER touches EXECUTIA_API_KEY.
 * All writes go through DB RPC (single transaction + advisory lock).
 */
import { db, hasSupabaseEnv } from "./db.js";
import { evaluateRules } from "../engine/rule-evaluator.js";
import { createExecutionId } from "../shared/crypto.js";
import { DECISIONS, EXECUTIA_STATUSES } from "../shared/statuses.js";

export function decisionToStatus(d) {
  if (d === DECISIONS.APPROVE) return EXECUTIA_STATUSES.APPROVED;
  if (d === DECISIONS.BLOCK)   return EXECUTIA_STATUSES.BLOCKED;
  return EXECUTIA_STATUSES.PENDING_REVIEW;
}

export function isCanonicalDecisionEnabled() {
  return process.env.EXECUTIA_CANONICAL_DECISION !== "false";
}

function normalizeExecutionBody(body = {}) {
  return {
    ...body,
    rule_context: body.rule_context ?? {}
  };
}

export function buildCanonicalEvaluation(body = {}) {
  const normalizedBody = normalizeExecutionBody(body);
  const evaluation = evaluateRules(normalizedBody);

  return {
    version: "1",
    decision: evaluation.decision,
    reason: evaluation.reason,
    status: decisionToStatus(evaluation.decision),
    risk: evaluation.risk || null,
    evaluated_at: new Date().toISOString(),
    source: "engine/rule-evaluator"
  };
}

function buildRpcPayload(body = {}) {
  const normalizedBody = normalizeExecutionBody(body);
  const payload = { ...normalizedBody };

  if (isCanonicalDecisionEnabled()) {
    payload.canonical_evaluation = buildCanonicalEvaluation(normalizedBody);
  }

  return payload;
}

// ── createExecution ─────────────────────────────────────────────────────────
// Calls DB RPC: one transaction, pg_advisory_xact_lock, decision + 3 inserts.
export async function createExecution(body = {}) {
  const normalizedBody = normalizeExecutionBody(body);
  const evaluation = evaluateRules(normalizedBody);

  if (!hasSupabaseEnv()) {
    const result = {
      ok: true,
      execution_id: createExecutionId(),
      status: decisionToStatus(evaluation.decision),
      decision: evaluation.decision,
      reason: evaluation.reason,
      mode: "DRY_RUN"
    };

    if (isCanonicalDecisionEnabled()) {
      result.canonical_evaluation = buildCanonicalEvaluation(normalizedBody);
    }

    return result;
  }

  const payload = buildRpcPayload(body);
  const { data, error } = await db().rpc("commit_execution", { payload });

  if (error) {
    if (error.message?.includes("commit_execution")) {
      throw Object.assign(
        new Error("Run sql/009_atomic_execution_rpc.sql and sql/009b_canonical_evaluation_bridge.sql in Supabase first."),
        { code: "RPC_NOT_DEPLOYED" }
      );
    }
    throw error;
  }
  return data;
}

// ── applyOperatorDecision ───────────────────────────────────────────────────
// Calls DB RPC: one transaction, pg_advisory_xact_lock, execution update + ledger + audit.
export async function applyOperatorDecision({ execution_id, decision, actor = "operator", reason = "" }) {
  const normalized = decision === "APPROVE" ? "APPROVE" : "BLOCK";
  const status     = normalized === "APPROVE" ? EXECUTIA_STATUSES.APPROVED : EXECUTIA_STATUSES.BLOCKED;

  if (!hasSupabaseEnv()) {
    return { execution_id, status, decision: normalized, mode: "DRY_RUN" };
  }

  const { data, error } = await db().rpc("commit_operator_decision", {
    p_execution_id: execution_id,
    p_decision: normalized,
    p_actor: actor,
    p_reason: reason || `OPERATOR_${normalized}`
  });

  if (error) {
    if (error.message?.includes("commit_operator_decision")) {
      throw Object.assign(new Error("Run sql/010_atomic_operator_decision_rpc.sql in Supabase first."), { code: "OPERATOR_RPC_NOT_DEPLOYED" });
    }
    throw error;
  }

  return data;
}

// ── listExecutions / listPendingReview ──────────────────────────────────────
const DRY_RUN_ROWS = [
  { execution_id: "00000000-0000-0000-0000-000000000001", status: "APPROVED",       decision: "APPROVE", reason: "DRY_RUN",                       request_type: "PAYMENT" },
  { execution_id: "00000000-0000-0000-0000-000000000002", status: "PENDING_REVIEW", decision: "REVIEW",  reason: "OPERATOR_REQUIRED",             request_type: "PAYMENT" },
  { execution_id: "00000000-0000-0000-0000-000000000003", status: "BLOCKED",        decision: "BLOCK",   reason: "AMOUNT_EXCEEDS_APPROVAL_LIMIT", request_type: "PAYMENT" }
];

export async function listExecutions(limit = 50) {
  if (!hasSupabaseEnv()) return DRY_RUN_ROWS;
  const { data, error } = await db().from("execution_results").select("*").order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}

export async function listPendingReview(limit = 50) {
  if (!hasSupabaseEnv()) return DRY_RUN_ROWS.filter(r => r.status === "PENDING_REVIEW");
  const { data, error } = await db().from("execution_results").select("*").eq("status", "PENDING_REVIEW").order("created_at", { ascending: true }).limit(limit);
  if (error) throw error;
  return data || [];
}
