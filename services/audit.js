import { sha256, stableStringify, nowIso } from "../shared/crypto.js";
import { db, hasSupabaseEnv } from "./db.js";
import { buildLedgerHash } from "./ledger.js";

/** Execution projection hash — delegates to ledger.js canonical formula (Phase 3A). */
export function buildExecutionHash(entry, prevHash = "GENESIS") {
  return buildLedgerHash({
    previous_hash: prevHash,
    execution_id: entry.execution_id,
    status: entry.status,
    decision: entry.decision || "REVIEW",
    payload: entry.payload || {}
  });
}

/** Supplemental audit hash formula (independent of executia/ledger/v1). */
export const AUDIT_HASH_FORMULA_ID = "executia/audit/v1";

export const AUDIT_VERIFY_AUTHORITY_MODE = "SUPPLEMENTAL_AUDIT_GLOBAL";

function envFlag(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return defaultValue;
  return raw === "true" || raw === "1";
}

function normalizePayload(payload = {}) {
  const base = payload && typeof payload === "object" ? payload : {};
  if (!base.chain_era) {
    return { ...base, chain_era: "3B1" };
  }
  return base;
}

/**
 * executia/audit/v1 — must match sql/012 executia_audit_event_hash (SQL parity for RPC).
 */
export function buildAuditHash(event, previousEventHash = "GENESIS") {
  const prev = previousEventHash || "GENESIS";
  const payload = event.payload || {};

  return sha256(
    String(event.execution_id ?? "") +
      String(event.event_type || event.action || "UNKNOWN") +
      String(event.actor || event.actor_email || "system") +
      stableStringify(payload) +
      prev
  );
}


async function buildAuditHashSql(event, previousEventHash = "GENESIS") {
  if (!hasSupabaseEnv()) {
    return buildAuditHash(event, previousEventHash);
  }

  const { data, error } = await db().rpc("executia_audit_event_hash", {
    p_execution_id: event.execution_id || null,
    p_event_type: event.event_type || event.action || "UNKNOWN",
    p_actor: event.actor || event.actor_email || "system",
    p_payload: event.payload || {},
    p_prev_hash: previousEventHash || "GENESIS"
  });

  if (error) throw error;
  return data;
}

export function resolveStoredAuditHashes(row = {}) {
  const event_hash = row.event_hash || row.hash || null;
  const prev_hash =
    row.prev_hash ||
    row.previous_event_hash ||
    row.previous_hash ||
    null;
  return { event_hash, prev_hash };
}

export function isLegacyAuditRow(row = {}) {
  // Phase 3B2: canonical supplemental audit rows must have event_hash.
  // Legacy projection rows may only have hash populated and must not be
  // verified with executia/audit/v1 formula.
  return !row.event_hash;
}

export function isStrictAuditChainEnabled() {
  return envFlag("EXECUTIA_STRICT_AUDIT_CHAIN", false);
}

export function isAuditRepairAllowed() {
  return envFlag("EXECUTIA_AUDIT_REPAIR_ALLOWED", false);
}

function auditCutoverIso() {
  return process.env.T_3B1_CUTOVER_ISO || process.env.EXECUTIA_AUDIT_CUTOVER_ISO || null;
}

function isBeforeCutover(created_at) {
  const cutover = auditCutoverIso();
  if (!cutover || !created_at) return false;
  return new Date(created_at).getTime() < new Date(cutover).getTime();
}

/** Global supplemental chain head (never per execution_id). */
export async function getLastAuditHash() {
  if (!hasSupabaseEnv()) return "GENESIS";

  const { data, error } = await db()
    .from("audit_events")
    .select("event_hash, hash, created_at, id")
    .not("event_hash", "is", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1);

  if (error) {
    const fallback = await db()
      .from("audit_events")
      .select("hash, created_at, id")
      .not("hash", "is", null)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1);

    if (fallback.error) throw fallback.error;
    return fallback.data?.[0]?.hash || "GENESIS";
  }

  return data?.[0]?.event_hash || data?.[0]?.hash || "GENESIS";
}

export async function writeAuditEvent(event = {}) {
  const created_at = event.created_at || nowIso();
  const prev_hash = await getLastAuditHash();
  const payload = normalizePayload(event.payload || {});

  const auditEvent = {
    event_type: event.event_type || event.action || "UNKNOWN",
    execution_id: event.execution_id || null,
    actor: event.actor || event.actor_email || "system",
    actor_email: event.actor_email || event.actor || null,
    actor_role: event.actor_role || null,
    action: event.action || null,
    previous_state: event.previous_state || null,
    next_state: event.next_state || null,
    reason: event.reason || null,
    payload,
    trace: event.trace || [],
    metadata: event.metadata || {},
    prev_hash,
    previous_hash: prev_hash,
    previous_event_hash: prev_hash,
    created_at
  };

  const event_hash = buildAuditHash(auditEvent, prev_hash);
  auditEvent.event_hash = event_hash;
  auditEvent.hash = event_hash;

  if (!hasSupabaseEnv()) {
    return {
      stored: false,
      mode: "DRY_RUN",
      auditEvent,
      formula: AUDIT_HASH_FORMULA_ID
    };
  }

  const { data, error } = await db()
    .from("audit_events")
    .insert(auditEvent)
    .select("*")
    .single();

  if (error) throw error;
  return { stored: true, auditEvent: data, formula: AUDIT_HASH_FORMULA_ID };
}

export async function verifyAuditChain(execution_id = null) {
  if (!hasSupabaseEnv()) {
    return {
      verified: true,
      mode: "DRY_RUN",
      entries: 0,
      authority_mode: AUDIT_VERIFY_AUTHORITY_MODE,
      formula: AUDIT_HASH_FORMULA_ID,
      chain_scope: "GLOBAL"
    };
  }

  const { data, error } = await db()
    .from("audit_events")
    .select("*")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) throw error;

  const rows = data || [];
  const strict = isStrictAuditChainEnabled();
  let previous = "GENESIS";
  let chained = 0;
  let legacy_skipped = 0;
  let pre_cutover_skipped = 0;
  let legacy_boundary_accepted = 0;

  for (const event of rows) {
    if (isLegacyAuditRow(event)) {
      legacy_skipped += 1;
      continue;
    }

    if (isBeforeCutover(event.created_at)) {
      pre_cutover_skipped += 1;
      if (strict) continue;
    }

    const { event_hash, prev_hash: storedPreviousRaw } = resolveStoredAuditHashes(event);
    const storedPrevious = storedPreviousRaw || "GENESIS";

    if (
      storedPrevious !== previous &&
      previous === "GENESIS" &&
      chained === 0 &&
      legacy_skipped > 0 &&
      storedPrevious !== "GENESIS"
    ) {
      previous = storedPrevious;
      legacy_boundary_accepted += 1;
    }

    if (storedPrevious !== previous) {
      return {
        verified: false,
        reason: "PREVIOUS_AUDIT_HASH_MISMATCH",
        audit_event_id: event.id,
        expected_previous_hash: previous,
        actual_previous_hash: storedPrevious,
        authority_mode: AUDIT_VERIFY_AUTHORITY_MODE,
        formula: AUDIT_HASH_FORMULA_ID,
        chain_scope: "GLOBAL"
      };
    }

    const expected = await buildAuditHashSql(event, storedPrevious);

    if (event_hash !== expected) {
      return {
        verified: false,
        reason: "AUDIT_HASH_MISMATCH",
        audit_event_id: event.id,
        expected,
        actual: event_hash,
        authority_mode: AUDIT_VERIFY_AUTHORITY_MODE,
        formula: AUDIT_HASH_FORMULA_ID,
        chain_scope: "GLOBAL"
      };
    }

    previous = event_hash;
    chained += 1;
  }

  const filtered_entries = execution_id
    ? rows.filter((row) => row.execution_id === execution_id).length
    : null;

  return {
    verified: true,
    entries: chained,
    legacy_skipped,
    pre_cutover_skipped,
    legacy_boundary_accepted,
    strict,
    authority_mode: AUDIT_VERIFY_AUTHORITY_MODE,
    formula: AUDIT_HASH_FORMULA_ID,
    chain_scope: "GLOBAL",
    ...(execution_id
      ? { execution_id, filtered_entries, filter_note: "Timeline filter does not alter global chain head." }
      : {})
  };
}

export async function repairAuditChain(execution_id = null) {
  if (!isAuditRepairAllowed()) {
    return {
      repaired: false,
      error: "AUDIT_REPAIR_DISABLED",
      message: "Set EXECUTIA_AUDIT_REPAIR_ALLOWED=true for break-glass repair only."
    };
  }

  if (!hasSupabaseEnv()) {
    return { repaired: true, mode: "DRY_RUN", entries: 0 };
  }

  let query = db()
    .from("audit_events")
    .select("*")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (execution_id) query = query.eq("execution_id", execution_id);

  const { data, error } = await query;
  if (error) throw error;

  let previous = "GENESIS";
  let repaired = 0;

  let skipped_chained = 0;

  for (const event of data || []) {
    if (!isLegacyAuditRow(event)) {
      skipped_chained += 1;
      const { event_hash } = resolveStoredAuditHashes(event);
      if (event_hash) previous = event_hash;
      continue;
    }

    const event_hash = buildAuditHash(event, previous);

    const { error: updateError } = await db()
      .from("audit_events")
      .update({
        event_hash,
        hash: event_hash,
        prev_hash: previous,
        previous_hash: previous,
        previous_event_hash: previous
      })
      .eq("id", event.id);

    if (updateError) throw updateError;

    previous = event_hash;
    repaired += 1;
  }

  return {
    repaired: true,
    entries: repaired,
    skipped_chained,
    warning:
      "Break-glass repair only backfills LEGACY rows; hashed rows are append-only (DB trigger).",
    ...(execution_id ? { execution_id } : {})
  };
}
