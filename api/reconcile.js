import { withEngine } from "../middleware/with-engine.js";
import { createSupabaseAdmin } from "../services/supabase-admin.js";
import { logAudit } from "../services/audit.js";
import { EXECUTION_STATUS } from "../engine/execution-states.js";

export default withEngine(async (req, res) => {
  const supabase = createSupabaseAdmin();
  const { ticketId, action, note } = req.body || {};
  const orgId = req.executia.organizationId;

  if (!ticketId || !action) {
    return res.status(400).json({ ok: false, error_code: "INVALID_RECON_REQUEST", error_message: "ticketId and action are required", request_id: req.executia.requestId });
  }
  if (!["confirm", "reject"].includes(action)) {
    return res.status(400).json({ ok: false, error_code: "INVALID_RECON_ACTION", error_message: "action must be confirm or reject", request_id: req.executia.requestId });
  }

  const { data: ticket, error: tErr } = await supabase
    .from("execution_tickets")
    .select("*")
    .eq("id", ticketId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (tErr || !ticket) {
    return res.status(404).json({ ok: false, error_code: "TICKET_NOT_FOUND", error_message: tErr?.message || "Ticket not found", request_id: req.executia.requestId });
  }
  if (ticket.status !== EXECUTION_STATUS.UNKNOWN_REQUIRES_RECONCILIATION) {
    return res.status(409).json({ ok: false, error_code: "RECON_NOT_REQUIRED", error_message: `Ticket status is ${ticket.status}`, request_id: req.executia.requestId });
  }

  const finalStatus = action === "confirm" ? EXECUTION_STATUS.EXECUTED : EXECUTION_STATUS.PROVIDER_REJECTED;
  const record = {
    id: `xr_man_${Date.now()}_${ticketId.slice(-6)}`,
    execution_ticket_id: ticketId,
    ledger_id: ticket.ledger_id,
    organization_id: orgId,
    provider_name: "executia_manual_reconcile",
    provider_transaction_id: null,
    provider_status: `manual_${action}`,
    response_payload: { action, note: note || null, actor: req.executia.operatorId || req.executia.auth?.keyId || null },
    final_status: finalStatus,
    is_reconciliation_event: true,
    reconciled_by: req.executia.operatorId || req.executia.auth?.keyId || null,
    reconciled_at: new Date().toISOString(),
    reconciliation_note: note || null,
    created_at: new Date().toISOString(),
  };

  const { error: insErr } = await supabase.from("execution_results").insert(record);
  if (insErr) {
    return res.status(500).json({ ok: false, error_code: "RECON_RECORD_FAILED", error_message: insErr.message, request_id: req.executia.requestId });
  }

  const { error: updErr } = await supabase.from("execution_tickets").update({ status: finalStatus }).eq("id", ticketId);
  if (updErr) {
    return res.status(500).json({ ok: false, error_code: "RECON_TICKET_UPDATE_FAILED", error_message: updErr.message, request_id: req.executia.requestId });
  }

  await logAudit(supabase, {
    organization_id: orgId,
    actor_type: req.executia.operatorId ? "operator" : "api_key",
    actor_id: req.executia.operatorId || req.executia.auth?.keyId || null,
    actor_label: req.executia.operatorEmail || null,
    action: "MANUAL_RECONCILIATION",
    entity: "ticket",
    entity_id: ticketId,
    status: "ok",
    request_id: req.executia.requestId,
    payload: { action, note: note || null, final_status: finalStatus }
  });

  return res.status(200).json({ ok: true, ticket_id: ticketId, action, final_status: finalStatus, request_id: req.executia.requestId });
}, { methods: ["POST"], requireAuth: true, rateLimit: true, requiredScope: "admin" });
