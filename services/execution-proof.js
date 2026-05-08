import { db, hasSupabaseEnv } from "./db.js";
import { createExecution } from "./execution.js";
import { sha256, stableStringify, nowIso } from "../shared/crypto.js";

export const EXECUTION_TRACE_STANDARD = [
  "REQUEST_RECEIVED",
  "VALIDATION_STARTED",
  "VALIDATION_PASSED",
  "POLICY_EVALUATED",
  "DECISION_COMMITTED",
  "LEDGER_LINKED",
  "AUDIT_RECORDED",
  "EXECUTION_FINALIZED"
];

function normalizeResult(result = {}) {
  const r = Array.isArray(result) ? result[0] : result;
  return {
    raw: r || {},
    execution_id: r?.execution_id || r?.id || r?.execution?.execution_id || null,
    status: r?.status || r?.execution?.status || "PENDING_REVIEW",
    decision: r?.decision || r?.execution?.decision || "REVIEW",
    reason: r?.reason || r?.execution?.reason || null
  };
}

function buildTrace({ execution_id, actor, status, decision }) {
  const ts = nowIso();

  return EXECUTION_TRACE_STANDARD.map((event_type, index) => ({
    index,
    event_type,
    execution_id,
    actor: actor || "system",
    status,
    decision,
    timestamp: ts
  }));
}

function buildAuditChain(events = []) {
  let previous_event_hash = "GENESIS";

  return events.map((event, index) => {
    const hash = sha256(stableStringify({
      index,
      event_type: event.event_type || "UNKNOWN",
      execution_id: event.execution_id || null,
      actor: event.actor || "system",
      timestamp: event.created_at || event.timestamp || null,
      payload: event.payload || {},
      previous_event_hash
    }));

    const chained = {
      ...event,
      previous_event_hash,
      hash
    };

    previous_event_hash = hash;
    return chained;
  });
}

async function readRows(table, execution_id, orderColumn = "created_at") {
  if (!hasSupabaseEnv() || !execution_id) return [];

  const { data, error } = await db()
    .from(table)
    .select("*")
    .eq("execution_id", execution_id)
    .order(orderColumn, { ascending: true });

  if (error) return [];
  return data || [];
}

async function readExecutionRow(execution_id) {
  if (!hasSupabaseEnv() || !execution_id) return null;

  const { data, error } = await db()
    .from("execution_results")
    .select("*")
    .eq("execution_id", execution_id)
    .maybeSingle();

  if (error) return null;
  return data || null;
}

export async function createExecutionProof(input = {}) {
  const committed = await createExecution(input);
  const normalized = normalizeResult(committed);

  const execution_id = normalized.execution_id;
  const actor =
    input.operator_email ||
    input.actor?.email ||
    input.actor ||
    "system";

  const [executionRow, ledgerEntries, coreLedgerEntries, auditEvents] = await Promise.all([
    readExecutionRow(execution_id),
    readRows("ledger_entries", execution_id),
    readRows("core_ledger", execution_id),
    readRows("audit_events", execution_id)
  ]);

  const trace = buildTrace({
    execution_id,
    actor,
    status: normalized.status,
    decision: normalized.decision
  });

  const audit_chain = buildAuditChain(auditEvents);

  const unified_execution_object = {
    execution_id,
    organization_id: input.organization_id || executionRow?.organization_id || null,
    request_type: input.request_type || executionRow?.request_type || "EXECUTION",
    actor: {
      id: input.operator_user_id || input.actor?.id || null,
      email: input.operator_email || input.actor?.email || null,
      role: input.operator_role || input.actor?.role || null
    },
    payload: input.payload || input,
    validation: {
      status: normalized.status === "BLOCKED" ? "FAILED" : "PASSED",
      timestamp: nowIso()
    },
    decision: {
      status: normalized.status,
      decision: normalized.decision,
      reason: normalized.reason,
      committed: true
    },
    ledger: {
      linked: ledgerEntries.length > 0 || coreLedgerEntries.length > 0,
      ledger_entries: ledgerEntries,
      core_ledger_entries: coreLedgerEntries
    },
    audit: {
      recorded: audit_chain.length > 0,
      immutable_chain: audit_chain
    },
    trace
  };

  const proof_hash = sha256(stableStringify(unified_execution_object));

  return {
    ok: true,
    proof_version: "EXECUTIA_PROOF_V1",
    committed: true,
    execution_id,
    proof_hash,
    unified_execution_object,
    raw_commit_result: normalized.raw
  };
}
