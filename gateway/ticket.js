/**
 * EXECUTIA™ — /gateway/ticket.js
 *
 * Execution tickets are the bridge between a committed decision and external action.
 * A ticket can only be used ONCE. It has a TTL. It encodes exactly what is allowed.
 *
 * Flow:
 *   COMMITTED decision
 *   → issue ticket
 *   → gateway validates ticket
 *   → gateway executes
 *   → gateway records result
 *   → ticket marked USED
 *
 * NO COMMITTED APPROVAL = NO TICKET.
 * NO VALID TICKET = NO EXECUTION.
 */

import { randomBytes, createHash } from "crypto";
import { EXECUTION_STATUS }        from "../engine/execution-states.js";
import { DECISION_STATES }         from "../engine/decision-states.js";

const TICKET_TTL_MINUTES = 30; // tickets expire after 30 minutes

/**
 * Issue an execution ticket after a committed APPROVE decision.
 * Throws if decision is not APPROVE + COMMITTED.
 *
 * @param {object} supabase
 * @param {object} commitResult    - Output of commitTruth()
 * @param {object} decisionResult  - Output of makeDecision()
 * @param {object} event           - Normalized event
 * @param {string} allowedAction   - What the ticket permits, e.g. "bank_transfer"
 * @param {object} payload         - Action-specific data to pass to provider
 * @returns {object}               - Ticket record
 */
export async function issueExecutionTicket({
  supabase,
  commitResult,
  decisionResult,
  event,
  allowedAction,
  payload = {},
}) {
  // Gate 1: decision must be APPROVE
  if (decisionResult.decision !== "APPROVE") {
    throw new Error(
      `EXECUTION_NOT_ALLOWED: decision is "${decisionResult.decision}" — only APPROVE permits execution`
    );
  }

  // Gate 2: truth must be committed
  if (commitResult.commit_state !== DECISION_STATES.COMMITTED) {
    throw new Error(
      `TRUTH_NOT_COMMITTED: commit_state is "${commitResult.commit_state}" — execution requires COMMITTED`
    );
  }

  const ticketId      = `xt_${randomBytes(8).toString("hex")}`;
  const idempotencyKey = createHash("sha256")
    .update(`${commitResult.ledger_id}:${allowedAction}:${event.organizationId}`)
    .digest("hex")
    .slice(0, 32);

  const expiresAt = new Date(Date.now() + TICKET_TTL_MINUTES * 60 * 1000).toISOString();

  const ticketRecord = {
    id:               ticketId,
    ledger_id:        commitResult.ledger_id,
    truth_hash:       commitResult.truth_hash,
    organization_id:  event.organizationId,
    project_id:       event.projectId || null,
    session_id:       event.sessionId,
    allowed_action:   allowedAction,
    payload,
    idempotency_key:  idempotencyKey,
    status:           EXECUTION_STATUS.NOT_STARTED,
    expires_at:       expiresAt,
    created_at:       new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("execution_tickets")
    .insert(ticketRecord)
    .select("id, idempotency_key, expires_at, status")
    .single();

  if (error) {
    throw new Error(`TICKET_ISSUE_FAILED: ${error.message}`);
  }

  return { ...ticketRecord, id: data.id };
}

/**
 * Validate a ticket before execution.
 * Throws on any invalidity — gateway must never execute on invalid ticket.
 */
export function assertValidTicket(ticket) {
  if (!ticket) {
    throw new Error("INVALID_TICKET: ticket is null or undefined");
  }

  if (ticket.status !== EXECUTION_STATUS.NOT_STARTED) {
    throw new Error(`TICKET_ALREADY_USED: status is "${ticket.status}" — each ticket may only be used once`);
  }

  if (new Date(ticket.expires_at) < new Date()) {
    throw new Error(`TICKET_EXPIRED: expired at ${ticket.expires_at}`);
  }

  return true;
}

/**
 * Mark a ticket as dispatched (in-flight to provider).
 * Call immediately before provider invocation.
 */
export async function markTicketDispatched(supabase, ticketId) {
  const { error } = await supabase
    .from("execution_tickets")
    .update({ status: EXECUTION_STATUS.DISPATCHED })
    .eq("id", ticketId)
    .eq("status", EXECUTION_STATUS.NOT_STARTED); // optimistic lock

  if (error) throw new Error(`TICKET_UPDATE_FAILED: ${error.message}`);
}
