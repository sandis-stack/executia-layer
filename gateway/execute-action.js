/**
 * EXECUTIA™ — /gateway/execute-action.js
 *
 * THE EXECUTION GATEWAY. Single point of external action.
 *
 * Rules:
 *   1. decision must be APPROVE
 *   2. commit_state must be COMMITTED
 *   3. ticket must be NOT_STARTED and not expired
 *   4. Only gateway calls provider — no direct provider access from anywhere else
 *   5. Result is always recorded — success, failure, or UNKNOWN
 *
 * On provider timeout or ambiguous response: UNKNOWN_REQUIRES_RECONCILIATION.
 * Never lie about execution state.
 */

import { assertValidTicket, markTicketDispatched } from "./ticket.js";
import { EXECUTION_STATUS, isTerminal }            from "../engine/execution-states.js";

/**
 * Execute an external action via the appropriate provider adapter.
 * Records execution result to supabase regardless of outcome.
 *
 * @param {object} supabase         - Supabase admin client
 * @param {object} ticket           - Validated execution ticket
 * @param {object} providerAdapter  - Provider with execute({ ticket, payload }) interface
 * @returns {object}                - Execution result record
 */
export async function executeAction({ supabase, ticket, providerAdapter }) {
  // Gate: validate ticket before touching the provider
  assertValidTicket(ticket);

  // Mark in-flight immediately — prevents double-execution on retry
  await markTicketDispatched(supabase, ticket.id);

  let providerResult;
  let finalStatus;

  try {
    providerResult = await providerAdapter.execute({
      ticket,
      payload: ticket.payload,
    });

    // Provider responded — map to execution status
    finalStatus = providerResult.accepted
      ? EXECUTION_STATUS.EXECUTED
      : EXECUTION_STATUS.PROVIDER_REJECTED;

  } catch (err) {
    // Network error, timeout, or ambiguous response
    console.error(`[EXECUTIA][GATEWAY] Provider error for ticket ${ticket.id}:`, err.message);

    const isTimeout  = err.message.includes("timeout") || err.message.includes("ETIMEDOUT");
    const isAmbiguous = err.message.includes("UNKNOWN") || err.message.includes("ambiguous");

    finalStatus    = (isTimeout || isAmbiguous)
      ? EXECUTION_STATUS.UNKNOWN_REQUIRES_RECONCILIATION
      : EXECUTION_STATUS.FAILED;

    providerResult = {
      accepted:              false,
      provider_status:       "error",
      provider_transaction_id: null,
      raw_response:          { error: err.message },
    };
  }

  // Record result — always, regardless of outcome
  const resultRecord = {
    id:                      `xr_${Date.now()}_${ticket.id.slice(-6)}`,
    execution_ticket_id:     ticket.id,
    ledger_id:               ticket.ledger_id,
    organization_id:         ticket.organization_id,
    provider_name:           providerAdapter.name,
    provider_transaction_id: providerResult.provider_transaction_id || null,
    provider_status:         providerResult.provider_status         || "unknown",
    response_payload:        providerResult.raw_response            || {},
    final_status:            finalStatus,
    created_at:              new Date().toISOString(),
  };

  const { error: resultErr } = await supabase
    .from("execution_results")
    .insert(resultRecord);

  if (resultErr) {
    // Result recording failure is critical — we executed but have no proof
    console.error("[EXECUTIA][GATEWAY] CRITICAL: Execution result recording failed:", resultErr.message);
    throw new Error(
      `EXECUTION_RESULT_UNRECORDED: Provider may have executed but result not saved. ` +
      `Ticket: ${ticket.id}. Manual reconciliation required.`
    );
  }

  // ── TICKET STATUS UPDATE ──────────────────────────────────────
  // execution_results is the authoritative external execution truth.
  // execution_tickets.status is a convenience cache — queryable without scanning results.
  //
  // If they diverge: execution_results wins. The divergence itself is recorded
  // as a second execution_results entry with final_status = UNKNOWN_REQUIRES_RECONCILIATION,
  // making the inconsistency visible in the immutable log rather than only in a response flag.

  const { error: ticketUpdateErr } = await supabase
    .from("execution_tickets")
    .update({ status: finalStatus })
    .eq("id", ticket.id);

  if (ticketUpdateErr) {
    console.error(
      `[EXECUTIA][GATEWAY] Ticket status cache update failed for ${ticket.id}. ` +
      `execution_results is authoritative. Recording divergence event. ` +
      `Error: ${ticketUpdateErr.message}`
    );

    // Record the divergence as a formal reconciliation event in execution_results.
    // This makes it visible in audit queries without relying on response flags.
    await supabase.from("execution_results").insert({
      id:                      `xr_div_${Date.now()}_${ticket.id.slice(-6)}`,
      execution_ticket_id:     ticket.id,
      ledger_id:               ticket.ledger_id,
      organization_id:         ticket.organization_id,
      provider_name:           "executia_internal",
      provider_transaction_id: null,
      provider_status:         "ticket_cache_divergence",
      response_payload: {
        authoritative_status:    finalStatus,
        ticket_update_error:     ticketUpdateErr.message,
        execution_result_id:     resultRecord.id,
        note: "execution_results is authoritative — ticket cache could not be updated",
      },
      final_status: EXECUTION_STATUS.UNKNOWN_REQUIRES_RECONCILIATION,
      created_at:   new Date().toISOString(),
    }).then(() => {}).catch(e =>
      console.error("[EXECUTIA][GATEWAY] Failed to record divergence event:", e.message)
    );

    // Mark result record so caller can detect and surface this
    resultRecord.ticket_cache_divergence = true;
  }

  return {
    ...resultRecord,
    execution_status: finalStatus,
    requires_reconciliation: finalStatus === EXECUTION_STATUS.UNKNOWN_REQUIRES_RECONCILIATION,
  };
}

/**
 * Reconcile an UNKNOWN execution result.
 * Call when a provider's status is unclear — checks provider directly.
 *
 * @param {object} supabase
 * @param {string} ticketId
 * @param {object} providerAdapter  - Must implement reconcile({ ticket }) method
 */
export async function reconcileExecution({ supabase, ticketId, providerAdapter }) {
  const { data: ticket, error: ticketFetchErr } = await supabase
    .from("execution_tickets")
    .select("*")
    .eq("id", ticketId)
    .single();

  if (ticketFetchErr || !ticket) {
    throw new Error(`RECONCILE_FAILED: ticket "${ticketId}" not found. ${ticketFetchErr?.message || ""}`);
  }

  if (ticket.status !== EXECUTION_STATUS.UNKNOWN_REQUIRES_RECONCILIATION) {
    throw new Error(`RECONCILE_NOT_NEEDED: ticket "${ticketId}" has status "${ticket.status}" — only UNKNOWN_REQUIRES_RECONCILIATION can be reconciled`);
  }

  if (!providerAdapter.reconcile) {
    throw new Error(`RECONCILE_NOT_SUPPORTED: provider "${providerAdapter.name}" has no reconcile() method`);
  }

  // Call provider reconcile
  let reconcileResult;
  try {
    reconcileResult = await providerAdapter.reconcile({ ticket });
  } catch (err) {
    throw new Error(`RECONCILE_PROVIDER_ERROR: ${err.message}`);
  }

  const resolvedStatus = reconcileResult.confirmed
    ? EXECUTION_STATUS.EXECUTED
    : reconcileResult.rejected
    ? EXECUTION_STATUS.PROVIDER_REJECTED
    : EXECUTION_STATUS.UNKNOWN_REQUIRES_RECONCILIATION; // still unknown

  // Write reconciliation result — this is authoritative
  const reconcileRecord = {
    id:                      `xr_rec_${Date.now()}_${ticketId.slice(-6)}`,
    execution_ticket_id:     ticketId,
    ledger_id:               ticket.ledger_id,
    organization_id:         ticket.organization_id,
    provider_name:           `${providerAdapter.name}_reconcile`,
    provider_transaction_id: reconcileResult.provider_transaction_id || null,
    provider_status:         `reconciled_${resolvedStatus.toLowerCase()}`,
    response_payload:        reconcileResult,
    final_status:            resolvedStatus,
    is_reconciliation_event: true,
    created_at:              new Date().toISOString(),
  };

  const { error: resultErr } = await supabase
    .from("execution_results")
    .insert(reconcileRecord);

  if (resultErr) {
    // Reconcile result not recorded — authoritative record missing
    throw new Error(`RECONCILE_RESULT_UNRECORDED: reconciliation completed but result not saved. ` +
      `Ticket: ${ticketId}, resolved to: ${resolvedStatus}. Manual action required. ${resultErr.message}`);
  }

  // Update ticket cache — surface divergence if this fails
  const { error: ticketUpdateErr } = await supabase
    .from("execution_tickets")
    .update({ status: resolvedStatus })
    .eq("id", ticketId);

  if (ticketUpdateErr) {
    console.error(
      `[EXECUTIA][RECONCILE] Ticket cache update failed for ${ticketId}. ` +
      `execution_results is authoritative (${resolvedStatus}). ${ticketUpdateErr.message}`
    );
    // Record divergence — mirrors executeAction() pattern
    await supabase.from("execution_results").insert({
      id:                      `xr_rec_div_${Date.now()}_${ticketId.slice(-6)}`,
      execution_ticket_id:     ticketId,
      ledger_id:               ticket.ledger_id,
      organization_id:         ticket.organization_id,
      provider_name:           "executia_internal",
      provider_transaction_id: null,
      provider_status:         "reconcile_ticket_cache_divergence",
      response_payload: {
        authoritative_status:  resolvedStatus,
        ticket_update_error:   ticketUpdateErr.message,
        reconcile_result_id:   reconcileRecord.id,
      },
      final_status:            EXECUTION_STATUS.UNKNOWN_REQUIRES_RECONCILIATION,
      is_reconciliation_event: true,
      created_at:              new Date().toISOString(),
    }).then(() => {}).catch(e =>
      console.error("[EXECUTIA][RECONCILE] Failed to record cache divergence:", e.message)
    );
  }

  return {
    resolved_status:    resolvedStatus,
    reconcile_result_id: reconcileRecord.id,
    ticket_cache_updated: !ticketUpdateErr,
    reconcileResult,
  };
}
