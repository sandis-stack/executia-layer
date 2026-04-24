
import { withEngine } from "../middleware/with-engine.js";
import { createSupabaseAdmin } from "../services/supabase-admin.js";
import { verifySignature } from "../services/signature.js";
import { logAudit } from "../services/audit.js";
import { EXECUTION_STATUS } from "../engine/execution-states.js";

export default withEngine(async (req, res) => {
  const raw = JSON.stringify(req.body || {});
  const signature = req.headers["x-executia-signature"] || req.headers["x-executia-sig"];
  const secret = process.env.WEBHOOK_CALLBACK_SECRET;
  const callbackEventId = req.headers["x-executia-event-id"] || req.body?.event_id || null;
  const callbackTimestamp = Number(req.headers["x-executia-timestamp"] || req.body?.timestamp || 0);
  if (!verifySignature(raw, signature, secret)) {
    return res.status(401).json({ ok: false, error_code: "INVALID_SIGNATURE", error_message: "Callback signature invalid", request_id: req.executia.requestId });
  }
  if (!callbackEventId || !callbackTimestamp) {
    return res.status(400).json({ ok:false, error_code:"INVALID_CALLBACK_META", error_message:"event id and timestamp required", request_id:req.executia.requestId });
  }
  if (Math.abs(Date.now() - callbackTimestamp) > 1000 * 60 * 5) {
    return res.status(409).json({ ok:false, error_code:"CALLBACK_EXPIRED", error_message:"Callback timestamp outside allowed window", request_id:req.executia.requestId });
  }

  const { ticket_id, status, provider_transaction_id, provider_name, note } = req.body || {};
  if (!ticket_id || !status) {
    return res.status(400).json({ ok: false, error_code: "INVALID_CALLBACK", error_message: "ticket_id and status required", request_id: req.executia.requestId });
  }

  const normalized = String(status).toUpperCase();
  const finalStatus = normalized === "EXECUTED" ? EXECUTION_STATUS.EXECUTED : normalized === "PROVIDER_REJECTED" ? EXECUTION_STATUS.PROVIDER_REJECTED : normalized === "FAILED" ? EXECUTION_STATUS.FAILED : EXECUTION_STATUS.UNKNOWN_REQUIRES_RECONCILIATION;
  const supabase = createSupabaseAdmin();

  const { data: existingEvent } = await supabase.from("webhook_events").select("id").eq("id", callbackEventId).maybeSingle();
  if (existingEvent) {
    return res.status(409).json({ ok:false, error_code:"CALLBACK_REPLAYED", error_message:"Callback event already processed", request_id:req.executia.requestId });
  }

  const { data: ticket, error: tErr } = await supabase.from("execution_tickets").select("*").eq("id", ticket_id).maybeSingle();
  if (tErr || !ticket) {
    return res.status(404).json({ ok: false, error_code: "TICKET_NOT_FOUND", error_message: tErr?.message || "Ticket not found", request_id: req.executia.requestId });
  }

  const { error: eventErr } = await supabase.from("webhook_events").insert({ id: callbackEventId, organization_id: ticket.organization_id, provider_name: provider_name || "provider_callback", signature, received_at: new Date().toISOString() });
  if (eventErr) {
    return res.status(409).json({ ok:false, error_code:"CALLBACK_EVENT_RECORD_FAILED", error_message:eventErr.message, request_id:req.executia.requestId });
  }

  const record = {
    id: `xr_cb_${Date.now()}_${ticket_id.slice(-6)}`,
    execution_ticket_id: ticket_id,
    ledger_id: ticket.ledger_id,
    organization_id: ticket.organization_id,
    provider_name: provider_name || "provider_callback",
    provider_transaction_id: provider_transaction_id || null,
    provider_status: `callback_${normalized.toLowerCase()}`,
    response_payload: { callback: req.body || {}, note: note || null, callback_event_id: callbackEventId },
    final_status: finalStatus,
    is_reconciliation_event: false,
    created_at: new Date().toISOString(),
  };

  const { error: insErr } = await supabase.from("execution_results").insert(record);
  if (insErr) {
    return res.status(500).json({ ok: false, error_code: "CALLBACK_RECORD_FAILED", error_message: insErr.message, request_id: req.executia.requestId });
  }
  const { error: updErr } = await supabase.from("execution_tickets").update({ status: finalStatus }).eq("id", ticket_id);
  if (updErr) {
    return res.status(500).json({ ok: false, error_code: "CALLBACK_TICKET_UPDATE_FAILED", error_message: updErr.message, request_id: req.executia.requestId });
  }

  await logAudit(supabase, {
    organization_id: ticket.organization_id,
    actor_type: "provider_callback",
    actor_id: provider_name || "provider_callback",
    action: "PROVIDER_CALLBACK_ACCEPTED",
    entity: "ticket",
    entity_id: ticket_id,
    status: "ok",
    request_id: req.executia.requestId,
    payload: { final_status: finalStatus, provider_transaction_id: provider_transaction_id || null, callback_event_id: callbackEventId }
  });

  return res.status(200).json({ ok: true, ticket_id, final_status: finalStatus, request_id: req.executia.requestId });
}, { methods: ["POST"], requireAuth: false, rateLimit: false });
