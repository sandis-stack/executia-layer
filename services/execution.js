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
import { writeAuditEvent } from "./audit.js";
import { commitCoreLedgerTransaction } from "./core-ledger.js";

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

export function isRpcOnlyOperatorEnabled() {
  return process.env.EXECUTIA_RPC_ONLY_OPERATOR !== "false";
}

const OPERATOR_DECISION_APPROVE = new Set(["APPROVE", "APPROVED"]);
const OPERATOR_DECISION_BLOCK = new Set(["BLOCK", "BLOCKED"]);

export function normalizeOperatorDecision(decision) {
  const d = String(decision ?? "").trim().toUpperCase();

  if (OPERATOR_DECISION_APPROVE.has(d)) return "APPROVE";
  if (OPERATOR_DECISION_BLOCK.has(d)) return "BLOCK";

  throw new OperatorDecisionError(
    "INVALID_OPERATOR_DECISION",
    `Invalid operator decision: ${decision === undefined || decision === null ? "(empty)" : String(decision)}.`,
    400
  );
}

export function operatorDecisionToStatus(decision) {
  return normalizeOperatorDecision(decision) === "APPROVE"
    ? EXECUTIA_STATUSES.APPROVED
    : EXECUTIA_STATUSES.BLOCKED;
}

export class OperatorDecisionError extends Error {
  constructor(code, message, status = 500) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function mapOperatorRpcError(error) {
  const msg = error?.message || "";
  if (msg.includes("EXECUTION_NOT_FOUND")) {
    return new OperatorDecisionError("EXECUTION_NOT_FOUND", "Execution not found.", 404);
  }
  if (msg.includes("EXECUTION_NOT_PENDING_REVIEW")) {
    return new OperatorDecisionError(
      "INVALID_EXECUTION_STATUS",
      "Execution is not in PENDING_REVIEW.",
      409
    );
  }
  if (msg.includes("commit_operator_decision")) {
    return Object.assign(
      new Error("Run sql/010_atomic_operator_decision_rpc.sql in Supabase first."),
      { code: "OPERATOR_RPC_NOT_DEPLOYED" }
    );
  }
  return error;
}

export function canonicalExecutionId(execution) {
  return execution?.execution_id || execution?.id;
}

export async function fetchOperatorExecution(supabase, { execution_id, organization_id }) {
  let query = supabase
    .from("execution_results")
    .select("*")
    .or(`id.eq.${execution_id},execution_id.eq.${execution_id}`);

  if (organization_id) {
    query = query.eq("organization_id", organization_id);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    throw new OperatorDecisionError(
      "EXECUTION_NOT_FOUND",
      organization_id
        ? "Execution not found for this organization."
        : "Execution not found.",
      404
    );
  }

  return data;
}

async function refetchOperatorExecution(supabase, execution, { execution_id, organization_id }) {
  const rpcExecutionId = canonicalExecutionId(execution);
  let query = supabase
    .from("execution_results")
    .select("*")
    .or(`id.eq.${rpcExecutionId},execution_id.eq.${rpcExecutionId}`);

  if (organization_id) {
    query = query.eq("organization_id", organization_id);
  }

  const { data, error } = await query.single();
  if (error || !data) throw error || new Error("EXECUTION_REFETCH_FAILED");
  return data;
}

async function legacyDirectOperatorStatusUpdate(
  supabase,
  execution,
  { execution_id, organization_id, operator, reason, terminalStatus, operatorAction }
) {
  const patch = {
    status: terminalStatus,
    operator_action: operatorAction,
    result: reason,
    operator_id: operator?.id ?? null,
    operator_email: operator?.email ?? null,
    reviewed_at: new Date().toISOString()
  };

  if (terminalStatus === EXECUTIA_STATUSES.APPROVED) {
    Object.assign(patch, {
      reconciliation_state: "VERIFIED",
      hash_verified: true,
      audit_state: "RECORDED",
      ledger_state: "HASH_LINKED"
    });
  }

  let query = supabase
    .from("execution_results")
    .update(patch)
    .or(`id.eq.${execution_id},execution_id.eq.${execution_id}`);

  if (organization_id) {
    query = query.eq("organization_id", organization_id);
  }

  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
}

export async function enrichOperatorApprovalMetadata(
  supabase,
  { execution_id, organization_id, operator, reason }
) {
  let query = supabase
    .from("execution_results")
    .update({
      operator_action: "APPROVED",
      result: reason,
      operator_id: operator.id,
      operator_email: operator.email,
      reviewed_at: new Date().toISOString(),
      reconciliation_state: "VERIFIED",
      hash_verified: true,
      audit_state: "RECORDED",
      ledger_state: "HASH_LINKED"
    })
    .or(`id.eq.${execution_id},execution_id.eq.${execution_id}`);

  if (organization_id) {
    query = query.eq("organization_id", organization_id);
  }

  const { error } = await query;
  if (error) throw error;
}

export async function enrichOperatorBlockMetadata(
  supabase,
  { execution_id, organization_id, operator, reason }
) {
  let query = supabase
    .from("execution_results")
    .update({
      operator_action: "BLOCKED",
      result: reason,
      operator_id: operator.id,
      operator_email: operator.email,
      reviewed_at: new Date().toISOString()
    })
    .or(`id.eq.${execution_id},execution_id.eq.${execution_id}`);

  if (organization_id) {
    query = query.eq("organization_id", organization_id);
  }

  const { error } = await query;
  if (error) throw error;
}

export async function writeOperatorSupplementalAudits({
  execution_id,
  organization_id,
  operator,
  previous_status,
  terminalStatus,
  reason
}) {
  const rpcExecutionId = execution_id;

  if (terminalStatus === EXECUTIA_STATUSES.APPROVED) {
    await writeAuditEvent({
      execution_id: rpcExecutionId,
      event_type: "OPERATOR_APPROVED",
      actor: operator.email,
      actor_email: operator.email,
      actor_role: operator.role,
      previous_state: previous_status,
      next_state: terminalStatus,
      reason,
      metadata: {
        organization_id,
        details: {
          reason,
          previous_status,
          new_status: terminalStatus
        }
      }
    });

    await writeAuditEvent({
      execution_id: rpcExecutionId,
      event_type: "RECONCILIATION_AUTO_VERIFIED",
      actor: operator.email,
      actor_email: operator.email,
      actor_role: operator.role,
      payload: {
        truth_state: "VERIFIED",
        hash_verified: true,
        reconciliation_state: "VERIFIED",
        trigger: "OPERATOR_APPROVED"
      },
      metadata: { organization_id }
    });
    return;
  }

  await writeAuditEvent({
    execution_id: rpcExecutionId,
    event_type: "OPERATOR_BLOCKED",
    actor: operator.email,
    actor_email: operator.email,
    actor_role: operator.role,
    previous_state: previous_status,
    next_state: terminalStatus,
    reason,
    metadata: {
      organization_id,
      details: {
        reason,
        previous_status,
        new_status: terminalStatus
      }
    }
  });
}

export async function materializeOperatorApprovalSideEffects({
  supabase,
  execution,
  execution_id,
  organization_id,
  operator,
  reason
}) {
  const rpcExecutionId = canonicalExecutionId(execution);

  const { data: existingCoreLedger } = await supabase
    .from("core_ledger")
    .select("*")
    .eq("execution_id", rpcExecutionId)
    .limit(1)
    .maybeSingle();

  if (existingCoreLedger) {
    return existingCoreLedger;
  }

  return commitCoreLedgerTransaction({
    execution_id: rpcExecutionId,
    organization_id,
    transaction_type: execution.request_type || execution.payload?.type || "EXECUTION_TRANSACTION",
    actor: execution.actor || operator.email,
    counterparty: execution.payload?.counterparty || null,
    subject: execution.subject || execution.payload?.request || "EXECUTION",
    amount: Number(execution.amount || execution.payload?.amount || 0),
    currency: execution.payload?.currency || "EUR",
    debit_account: execution.payload?.debit_account || "INFRA_EXP",
    credit_account: execution.payload?.credit_account || "BANK",
    tax_type: execution.payload?.tax_type || null,
    tax_rate: Number(execution.payload?.tax_rate || 0),
    status: "APPROVED",
    decision: "APPROVE",
    reconciliation_state: "VERIFIED",
    settlement_status: "PENDING",
    payload: {
      source: "operator_approve_auto_core_ledger",
      execution_hash: execution.hash || null,
      settlement_state: "PENDING",
      reconciliation_state: "VERIFIED"
    }
  });
}

export async function syncCoreLedgerTerminalState(supabase, execution_id, { status, decision }) {
  const { error } = await supabase
    .from("core_ledger")
    .update({ status, decision })
    .eq("execution_id", execution_id);

  if (error) throw error;
}

// ── applyOperatorDecision ───────────────────────────────────────────────────
// Calls DB RPC: one transaction, pg_advisory_xact_lock, execution update + ledger + audit.
export async function applyOperatorDecision({ execution_id, decision, actor = "operator", reason = "" }) {
  const normalized = normalizeOperatorDecision(decision);
  const status     = operatorDecisionToStatus(decision);

  if (!hasSupabaseEnv()) {
    return { ok: true, execution_id, status, decision: normalized, mode: "DRY_RUN" };
  }

  const { data, error } = await db().rpc("commit_operator_decision", {
    p_execution_id: execution_id,
    p_decision: normalized,
    p_actor: actor,
    p_reason: reason || `OPERATOR_${normalized}`
  });

  if (error) {
    throw mapOperatorRpcError(error);
  }

  return data;
}

/**
 * Terminal operator commit: RPC (or legacy) for PENDING_REVIEW → APPROVED/BLOCKED,
 * then non-status metadata, supplemental audit, and optional core ledger.
 */
export async function commitOperatorTerminalDecision({
  execution_id,
  decision,
  actor,
  reason = "",
  organization_id,
  operator,
  supabase = db(),
  enrichMetadata = true,
  supplementalAudit = true,
  materializeCoreLedger = true
}) {
  const execution = await fetchOperatorExecution(supabase, { execution_id, organization_id });
  const rpcExecutionId = canonicalExecutionId(execution);
  const normalized = normalizeOperatorDecision(decision);
  const terminalStatus = operatorDecisionToStatus(decision);
  const operatorActor = actor || operator?.email || "operator";

  if (execution.status !== EXECUTIA_STATUSES.PENDING_REVIEW) {
    throw new OperatorDecisionError(
      "INVALID_EXECUTION_STATUS",
      `Execution cannot transition from status ${execution.status}.`,
      409
    );
  }

  let rpcResult;

  if (isRpcOnlyOperatorEnabled()) {
    rpcResult = await applyOperatorDecision({
      execution_id: rpcExecutionId,
      decision: normalized,
      actor: operatorActor,
      reason
    });
  } else {
    await legacyDirectOperatorStatusUpdate(supabase, execution, {
      execution_id,
      organization_id,
      operator,
      reason,
      terminalStatus,
      operatorAction: terminalStatus
    });
    rpcResult = {
      ok: true,
      execution_id: rpcExecutionId,
      status: terminalStatus,
      decision: normalized,
      mode: "LEGACY_DIRECT"
    };
  }

  if (operator && enrichMetadata) {
    if (terminalStatus === EXECUTIA_STATUSES.APPROVED) {
      await enrichOperatorApprovalMetadata(supabase, {
        execution_id,
        organization_id,
        operator,
        reason
      });
    } else {
      await enrichOperatorBlockMetadata(supabase, {
        execution_id,
        organization_id,
        operator,
        reason
      });
    }
  }

  if (operator && supplementalAudit) {
    await writeOperatorSupplementalAudits({
      execution_id: rpcExecutionId,
      organization_id,
      operator,
      previous_status: execution.status,
      terminalStatus,
      reason
    });
  }

  let core_ledger = null;

  if (terminalStatus === EXECUTIA_STATUSES.APPROVED && operator && materializeCoreLedger) {
    core_ledger = await materializeOperatorApprovalSideEffects({
      supabase,
      execution,
      execution_id,
      organization_id,
      operator,
      reason
    });
  }

  const updated = await refetchOperatorExecution(supabase, execution, {
    execution_id,
    organization_id
  });

  return {
    rpcResult,
    execution: updated,
    status: terminalStatus,
    decision: normalized,
    core_ledger
  };
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
