import { sha256 } from "../shared/crypto.js";

export function buildExecutionHash(entry, prevHash = "GENESIS") {
  const executionId = entry.execution_id;
  const status = entry.status;
  const decision = entry.decision || "REVIEW";
  return sha256(`${executionId}${status}${decision}${prevHash}`);
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
