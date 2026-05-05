import { sha256, stableStringify } from "../shared/crypto.js";

export function buildExecutionHash(entry, prevHash = "GENESIS") {
  return sha256(stableStringify({
    execution_id: entry.execution_id,
    status:       entry.status,
    decision:     entry.decision || null,
    prev_hash:    prevHash
  }));
}

import { db, hasSupabaseEnv } from "./db.js";
import { nowIso } from "../shared/crypto.js";

export async function writeAuditEvent(event) {
  const auditEvent = {
    event_type: event.event_type || "UNKNOWN",
    execution_id: event.execution_id || null,
    actor: event.actor || "system",
    payload: event.payload || {},
    created_at: nowIso()
  };

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
