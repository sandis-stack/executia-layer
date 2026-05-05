import { db, hasSupabaseEnv } from "./db.js";
import { evaluateRules } from "../engine/rule-evaluator.js";
import { commitLedgerEntry } from "./ledger.js";
import { writeAuditEvent } from "./audit.js";
import { createExecutionId, nowIso } from "../shared/crypto.js";
import { buildExecutionHash } from "./audit.js";
import { commitCoreLedgerTransaction } from "./core-ledger.js";
import { DECISIONS, EXECUTIA_STATUSES } from "../shared/statuses.js";

export function decisionToStatus(decision) {
  if (decision === DECISIONS.APPROVE) return EXECUTIA_STATUSES.APPROVED;
  if (decision === DECISIONS.BLOCK) return EXECUTIA_STATUSES.BLOCKED;
  return EXECUTIA_STATUSES.PENDING_REVIEW;
}

export async function createExecution(body = {}) {
  const execution_id = createExecutionId();
  const ruleResult = evaluateRules(body);
  const status = decisionToStatus(ruleResult.decision);

  const executionRecord = {
    execution_id,
    request_type:    body.request_type    || "UNKNOWN",
    actor:           body.actor           || "unknown",
    subject:         body.subject         || "unknown",
    organization_id: body.organization_id || null,
    status,
    decision:        ruleResult.decision,
    reason:          ruleResult.reason,
    payload:         body,
    created_at:      nowIso(),
    updated_at:      nowIso()
  };

  let storedRecord = executionRecord;

  if (hasSupabaseEnv()) {
    // --- execution hash chain ---
    const prevRow = await db()
      .from("execution_results")
      .select("hash")
      .order("created_at", { ascending: false })
      .limit(1);

    const prevHash = prevRow.data?.[0]?.hash || "GENESIS";
    executionRecord.prev_hash = prevHash;
    executionRecord.hash = buildExecutionHash(executionRecord, prevHash);
  }

  if (hasSupabaseEnv()) {
    const { data, error } = await db()
      .from("execution_results")
      .insert(executionRecord)
      .select("*")
      .single();

    if (error) throw error;
    storedRecord = data;
  }

  await writeAuditEvent({
    event_type: "EXECUTION_REQUEST_CREATED",
    execution_id,
    actor: executionRecord.actor,
    payload: { status, decision: ruleResult.decision, reason: ruleResult.reason }
  });

  const ledger = await commitLedgerEntry({
    execution_id,
    status,
    payload: {
      request_type: executionRecord.request_type,
      actor: executionRecord.actor,
      subject: executionRecord.subject,
      decision: executionRecord.decision,
      reason: executionRecord.reason
    }
  });

  return { execution: storedRecord, validation: ruleResult.validation, ledger };
}

export async function listExecutions(limit = 50) {
  if (!hasSupabaseEnv()) {
    return [
      { execution_id: "dry-run-001", status: "APPROVED", decision: "APPROVE", reason: "DRY_RUN" },
      { execution_id: "dry-run-002", status: "PENDING_REVIEW", decision: "REVIEW", reason: "OPERATOR_REQUIRED" },
      { execution_id: "dry-run-003", status: "BLOCKED", decision: "BLOCK", reason: "AMOUNT_EXCEEDS_APPROVAL_LIMIT" }
    ];
  }

  const { data, error } = await db()
    .from("execution_results")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function applyOperatorDecision({ execution_id, decision, actor = "operator", reason = "" }) {
  const normalized = String(decision || "").toUpperCase();
  let status = EXECUTIA_STATUSES.PENDING_REVIEW;

  if (normalized === "APPROVE") status = EXECUTIA_STATUSES.APPROVED;
  if (normalized === "BLOCK") status = EXECUTIA_STATUSES.BLOCKED;

  const payload = {
    operator_decision: normalized,
    operator_reason: reason,
    operator_actor: actor,
    updated_at: nowIso()
  };

  let updated = { execution_id, status, decision: normalized, ...payload };

  if (hasSupabaseEnv()) {
    // recompute hash on operator decision
    const prevRow = await db()
      .from("execution_results")
      .select("hash")
      .eq("execution_id", execution_id)
      .single();

    const prevHash = prevRow.data?.hash || "GENESIS";
    const updatedEntry = { execution_id, status, decision: normalized };
    const newHash = buildExecutionHash(updatedEntry, prevHash);

    const { data, error } = await db()
      .from("execution_results")
      .update({
        status,
        decision: normalized,
        reason: reason || `OPERATOR_${normalized}`,
        prev_hash: prevHash,
        hash: newHash,
        updated_at: nowIso()
      })
      .eq("execution_id", execution_id)
      .select("*")
      .single();

    if (error) throw error;
    updated = data;
  }

  await writeAuditEvent({
    event_type: "OPERATOR_DECISION_APPLIED",
    execution_id,
    actor,
    payload
  });

  const ledger = await commitLedgerEntry({ execution_id, status, payload });

  // EXECUTION → CORE LEDGER → AUTO-SETTLE (only on APPROVE)
  let coreLedger = null;
  if (normalized === "APPROVE") {
    coreLedger = await commitCoreLedgerTransaction({
      execution_id,
      transaction_type: "EXECUTION_RESULT",
      actor,
      subject:          updated.subject         || "Execution commit",
      amount:           updated.amount          || 0,
      currency:         "EUR",
      organization_id:  updated.organization_id || null,
      status:           "COMMITTED",
      decision:         "APPROVE",
      payload:          { reason: reason || "OPERATOR_APPROVED" }
    });

    // Advance execution_results status: APPROVED → COMMITTED
    if (hasSupabaseEnv() && coreLedger) {
      await db()
        .from("execution_results")
        .update({ status: "COMMITTED", updated_at: nowIso() })
        .eq("execution_id", execution_id);
    }
  }

  let settlement = null;
  if (coreLedger?.id && coreLedger?.debit_account && coreLedger?.credit_account) {
    try {
      const { settleLedgerEntry } = await import("./settlement.js");
      settlement = await settleLedgerEntry(coreLedger.id);
    } catch (_) {
      // settlement is best-effort; execution is already committed
    }
  }

  return { execution: updated, ledger, core_ledger: coreLedger, settlement };
}
