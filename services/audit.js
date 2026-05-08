import { sha256, stableStringify, nowIso } from "../shared/crypto.js";
import { db, hasSupabaseEnv } from "./db.js";

export function buildExecutionHash(entry, prevHash = "GENESIS") {
  const executionId = entry.execution_id;
  const status = entry.status;
  const decision = entry.decision || "REVIEW";
  return sha256(`${executionId}${status}${decision}${prevHash}`);
}

export function buildAuditHash(event, previousEventHash = "GENESIS") {
  return sha256(stableStringify({
    execution_id: event.execution_id || null,
    event_type: event.event_type || event.action || "UNKNOWN",
    actor: event.actor || event.actor_email || "system",
    actor_role: event.actor_role || null,
    action: event.action || null,
    previous_state: event.previous_state || null,
    next_state: event.next_state || null,
    reason: event.reason || null,
    payload: event.payload || {},
    trace: event.trace || [],
    metadata: event.metadata || {},
    created_at: event.created_at || null,
    previous_event_hash: previousEventHash
  }));
}

export async function getLastAuditHash(execution_id = null) {
  if (!hasSupabaseEnv()) return "GENESIS";

  let query = db()
    .from("audit_events")
    .select("hash")
    .order("created_at", { ascending: false })
    .limit(1);

  if (execution_id) {
    query = query.eq("execution_id", execution_id);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data?.[0]?.hash || "GENESIS";
}

export async function writeAuditEvent(event = {}) {
  const created_at = event.created_at || nowIso();
  const previous_hash = await getLastAuditHash(event.execution_id || null);

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
    payload: event.payload || {},
    trace: event.trace || [],
    metadata: event.metadata || {},
    previous_hash,
    previous_event_hash: previous_hash,
    created_at
  };

  auditEvent.hash = buildAuditHash(auditEvent, previous_hash);

  if (!hasSupabaseEnv()) {
    return { stored: false, auditEvent };
  }

  const { data, error } = await db()
    .from("audit_events")
    .insert(auditEvent)
    .select("*")
    .single();

  if (error) throw error;
  return { stored: true, auditEvent: data };
}

export async function verifyAuditChain(execution_id = null) {
  if (!hasSupabaseEnv()) {
    return { verified: true, mode: "DRY_RUN", entries: 0 };
  }

  let query = db()
    .from("audit_events")
    .select("*")
    .order("created_at", { ascending: true });

  if (execution_id) {
    query = query.eq("execution_id", execution_id);
  }

  const { data, error } = await query;
  if (error) throw error;

  let previous = "GENESIS";

  for (const event of data || []) {
    const storedPrevious =
      event.previous_event_hash ||
      event.previous_hash ||
      "GENESIS";

    if (storedPrevious !== previous) {
      return {
        verified: false,
        reason: "PREVIOUS_AUDIT_HASH_MISMATCH",
        audit_event_id: event.id,
        expected_previous_hash: previous,
        actual_previous_hash: storedPrevious
      };
    }

    const expected = buildAuditHash(event, storedPrevious);

    if (event.hash !== expected) {
      return {
        verified: false,
        reason: "AUDIT_HASH_MISMATCH",
        audit_event_id: event.id,
        expected,
        actual: event.hash
      };
    }

    previous = event.hash;
  }

  return {
    verified: true,
    entries: (data || []).length,
    ...(execution_id ? { execution_id } : {})
  };
}

export async function repairAuditChain(execution_id = null) {
  if (!hasSupabaseEnv()) {
    return { repaired: true, mode: "DRY_RUN", entries: 0 };
  }

  let query = db()
    .from("audit_events")
    .select("*")
    .order("created_at", { ascending: true });

  if (execution_id) query = query.eq("execution_id", execution_id);

  const { data, error } = await query;
  if (error) throw error;

  let previous = "GENESIS";
  let repaired = 0;

  for (const event of data || []) {
    const hash = buildAuditHash(event, previous);

    const { error: updateError } = await db()
      .from("audit_events")
      .update({
        hash,
        previous_hash: previous,
        previous_event_hash: previous
      })
      .eq("id", event.id);

    if (updateError) throw updateError;

    previous = hash;
    repaired += 1;
  }

  return {
    repaired: true,
    entries: repaired,
    ...(execution_id ? { execution_id } : {})
  };
}
