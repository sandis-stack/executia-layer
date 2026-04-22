/**
 * EXECUTIA™ — /services/audit.js
 * Structured immutable audit logging.
 */

export async function logAudit(supabase, entry = {}) {
  try {
    const payload = {
      id: entry.id || `al_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
      organization_id: entry.organization_id || null,
      actor_type: entry.actor_type || "system",
      actor_id: entry.actor_id || null,
      actor_label: entry.actor_label || null,
      action: entry.action || "UNKNOWN_ACTION",
      entity: entry.entity || "system",
      entity_id: entry.entity_id || null,
      status: entry.status || "ok",
      request_id: entry.request_id || null,
      payload: entry.payload || {},
      created_at: entry.created_at || new Date().toISOString(),
    };
    await supabase.from("audit_logs").insert(payload);
    return true;
  } catch (err) {
    console.error("[EXECUTIA][AUDIT] Failed:", err.message);
    return false;
  }
}
