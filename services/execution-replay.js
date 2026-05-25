/**
 * EXECUTIA execution replay governance (read-only deterministic revalidation).
 */
import { db, hasSupabaseEnv } from "./db.js";

export const REPLAY_MODE = "READ_ONLY_DETERMINISTIC_REVALIDATION";

export const REPLAY_CANONICAL_NOTE =
  "Replay is read-only. Canonical truth remains Phase 3B3 audit verification + ledger_entries.";

export const PUBLIC_VERIFY_CANONICAL_NOTE =
  "Public verification is read-only. Canonical truth remains Phase 3B3 audit verification + ledger_entries.";

export function resolveCanonicalReplayResult(canonical_replay_safe) {
  return canonical_replay_safe ? "REPLAY_SAFE" : "REPLAY_CHECK";
}

export function buildReplayTimeline({
  execution = null,
  audit_events_count = 0,
  ledger_entries_count = 0,
  canonical_replay_result = "REPLAY_CHECK"
}) {
  const hash = execution?.hash || null;
  const previous_hash = execution?.prev_hash || execution?.previous_hash || null;

  return [
    {
      step: 1,
      layer: "EXECUTION_RESULT",
      status: execution?.status ?? null,
      decision: execution?.decision ?? null,
      hash,
      previous_hash,
      created_at: execution?.created_at ?? null
    },
    {
      step: 2,
      layer: "AUDIT_EVENTS",
      count: audit_events_count,
      verified_presence: audit_events_count > 0
    },
    {
      step: 3,
      layer: "LEDGER_ENTRIES",
      count: ledger_entries_count,
      verified_presence: ledger_entries_count > 0
    },
    {
      step: 4,
      layer: "REPLAY_DECISION",
      result: canonical_replay_result
    }
  ];
}

export function buildDeterministicReplay({
  execution_id,
  execution = null,
  audit_events_count = 0,
  ledger_entries_count = 0
}) {
  const execution_found = Boolean(execution);
  const hash = execution?.hash || null;
  const previous_hash = execution?.prev_hash || execution?.previous_hash || null;

  const deterministic_checks = {
    execution_hash_present: Boolean(hash),
    previous_hash_present: Boolean(previous_hash),
    audit_events_present: audit_events_count > 0,
    ledger_entries_present: ledger_entries_count > 0,
    canonical_replay_safe: false
  };

  deterministic_checks.canonical_replay_safe =
    execution_found &&
    deterministic_checks.execution_hash_present &&
    deterministic_checks.previous_hash_present &&
    deterministic_checks.audit_events_present &&
    deterministic_checks.ledger_entries_present;

  const canonical_replay_result = resolveCanonicalReplayResult(
    deterministic_checks.canonical_replay_safe
  );

  const timeline = buildReplayTimeline({
    execution,
    audit_events_count,
    ledger_entries_count,
    canonical_replay_result
  });

  return {
    replay_mode: REPLAY_MODE,
    execution_id,
    execution_found,
    status: execution?.status ?? null,
    decision: execution?.decision ?? null,
    actor: execution?.actor ?? null,
    subject: execution?.subject ?? null,
    hash,
    previous_hash,
    audit_events_count,
    ledger_entries_count,
    deterministic_checks,
    canonical_replay_result,
    timeline,
    canonical_note: REPLAY_CANONICAL_NOTE
  };
}

export function buildPublicVerifyPayload(replay) {
  return {
    public_verify: true,
    execution_id: replay.execution_id,
    execution_found: replay.execution_found,
    status: replay.status,
    decision: replay.decision,
    hash: replay.hash,
    previous_hash: replay.previous_hash,
    audit_events_count: replay.audit_events_count,
    ledger_entries_count: replay.ledger_entries_count,
    canonical_replay_result: replay.canonical_replay_result,
    canonical_note: PUBLIC_VERIFY_CANONICAL_NOTE
  };
}

async function loadLedgerEntryCount(execution_id) {
  try {
    const { count, error } = await db()
      .from("ledger_entries")
      .select("*", { count: "exact", head: true })
      .eq("execution_id", execution_id);

    if (error) return 0;
    return count || 0;
  } catch (_) {
    return 0;
  }
}

export async function loadExecutionReplayReadOnly({
  execution_id,
  organization_id = null
}) {
  if (!hasSupabaseEnv()) {
    return {
      mode: "DRY_RUN",
      execution: null,
      audit_events_count: 0,
      ledger_entries_count: 0
    };
  }

  let executionQuery = db()
    .from("execution_results")
    .select("*")
    .eq("execution_id", execution_id);

  if (organization_id) {
    executionQuery = executionQuery.eq("organization_id", organization_id);
  }

  const { data: execution, error: executionError } = await executionQuery.maybeSingle();
  if (executionError) throw executionError;

  if (!execution) {
    return {
      execution: null,
      audit_events_count: 0,
      ledger_entries_count: 0
    };
  }

  const { data: auditEvents, error: auditError } = await db()
    .from("audit_events")
    .select("id")
    .eq("execution_id", execution_id);

  if (auditError) throw auditError;

  const ledger_entries_count = await loadLedgerEntryCount(execution_id);

  return {
    execution,
    audit_events_count: (auditEvents || []).length,
    ledger_entries_count
  };
}
