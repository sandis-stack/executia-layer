import { checkRateLimit } from "../services/rate-limit.js";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { writeLedgerEvent } from "../services/ledger.js";
import { signPayload } from "../../services/signature.js";

function sortKeys(obj) {
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) return obj;
  return Object.keys(obj).sort().reduce((acc, k) => { acc[k] = sortKeys(obj[k]); return acc; }, {});
}
 *
 * Execution gateway: validates and consumes a ticket.
 * Without a valid ticket, no real-world action proceeds.
 *
 * Principle: GATEWAY consumes permission. REGISTRY records truth.
 */

function json(res, status, payload) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "https://executia.io");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  return res.status(status).json(payload);
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return json(res, 405, { ok: false, error: "METHOD_NOT_ALLOWED" });

  const rateCheck = await checkRateLimit(req, "gateway");
  if (rateCheck) return json(res, rateCheck.status, rateCheck.body);

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return json(res, 500, { ok: false, error: "SUPABASE_ENV_MISSING" });

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  try {
    const { ticket_id, action_payload } = req.body || {};

    if (!ticket_id) return json(res, 400, { ok: false, error: "MISSING_TICKET_ID" });

    // Read ticket by ticket_id (text field, xt_...)
    const { data: ticket, error: readError } = await supabase
      .from("execution_tickets")
      .select("id, ticket_id, execution_id, allowed_action, status, valid_until, payload, expected_payload_hash")
      .eq("ticket_id", ticket_id)
      .maybeSingle();

    if (readError) return json(res, 500, { ok: false, error: "TICKET_READ_FAILED",  message: readError.message });
    if (!ticket)   return json(res, 404, { ok: false, error: "TICKET_NOT_FOUND",    ticket_id });

    if (ticket.status === "USED") {
      return json(res, 403, { ok: false, error: "TICKET_ALREADY_USED",
        execution_id: ticket.execution_id });
    }

    if (ticket.status === "CANCELLED") {
      return json(res, 403, { ok: false, error: "TICKET_CANCELLED" });
    }

    if (new Date(ticket.valid_until) < new Date()) {
      // Mark expired
      await supabase
        .from("execution_tickets")
        .update({ status: "EXPIRED" })
        .eq("ticket_id", ticket_id)
        .catch(() => null);

      return json(res, 403, { ok: false, error: "TICKET_EXPIRED", valid_until: ticket.valid_until });
    }

    const now = new Date().toISOString();

    // ── Cryptographic signature verification ──────────────────────────────────
    const signingSecret = process.env.TICKET_SIGNING_SECRET;

    if (ticket.ticket_signature && signingSecret) {
      const expectedPayload = [
        ticket.execution_id,
        ticket.allowed_action,
        ticket.payload?.amount   || "",
        ticket.payload?.currency || "EUR",
        ticket.valid_until
      ].join(":");

      const expectedSig  = signPayload(expectedPayload, signingSecret);
      const receivedSig  = ticket.ticket_signature;

      // timingSafeEqual via Buffer comparison
      const sigA = Buffer.from(expectedSig);
      const sigB = Buffer.from(receivedSig);
      const sigValid = sigA.length === sigB.length &&
        crypto.timingSafeEqual(sigA, sigB);

      if (!sigValid) {
        await supabase
          .from("audit_logs")
          .insert({
            execution_id: ticket.execution_id,
            event_type:   "GATEWAY_SIGNATURE_INVALID",
            actor:        "EXECUTIA_GATEWAY",
            message:      "Ticket signature verification failed. Forged or tampered ticket detected.",
            payload:      { ticket_id }
          })
          .catch(() => null);

        await writeLedgerEvent({
          execution_id: ticket.execution_id,
          event_type:   "GATEWAY_SIGNATURE_INVALID",
          actor:        "EXECUTIA_GATEWAY",
          payload:      { ticket_id, reason: "HMAC_MISMATCH" }
        }).catch(() => null);

        return json(res, 403, {
          ok:      false,
          error:   "GATEWAY_SIGNATURE_INVALID",
          message: "Ticket signature is invalid. Execution not permitted."
        });
      }
    }

    // ── Hash verification: action_payload must match ticket's expected hash ───
    if (ticket.expected_payload_hash && action_payload && Object.keys(action_payload).length > 0) {
      const incoming_hash = crypto
        .createHash("sha256")
        .update(JSON.stringify(sortKeys(action_payload)))
        .digest("hex");

      if (incoming_hash !== ticket.expected_payload_hash) {
        await supabase
          .from("audit_logs")
          .insert({
            execution_id: ticket.execution_id,
            event_type:   "GATEWAY_HASH_MISMATCH",
            actor:        "EXECUTIA_GATEWAY",
            message:      "Action payload hash does not match authorized ticket hash. Replay or tampering detected.",
            payload:      { ticket_id, expected: ticket.expected_payload_hash, received: incoming_hash }
          })
          .catch(() => null);

        return json(res, 403, {
          ok:      false,
          error:   "GATEWAY_HASH_MISMATCH",
          message: "Action payload does not match the authorized ticket. Execution not permitted."
        });
      }
    }

    // ── Field-level validation (amount/currency/action) ───────────────────────
    if (action_payload && Object.keys(action_payload).length > 0 && ticket.payload) {
      const mismatches = [];

      // Amount check
      if (action_payload.amount != null && ticket.payload.amount != null) {
        if (Number(action_payload.amount) !== Number(ticket.payload.amount)) {
          mismatches.push({
            field:    "amount",
            ticket:   ticket.payload.amount,
            received: action_payload.amount
          });
        }
      }

      // Currency check
      if (action_payload.currency && ticket.payload.currency) {
        if (String(action_payload.currency).toUpperCase() !== String(ticket.payload.currency).toUpperCase()) {
          mismatches.push({
            field:    "currency",
            ticket:   ticket.payload.currency,
            received: action_payload.currency
          });
        }
      }

      // Action type check
      if (action_payload.action && ticket.payload.action) {
        if (action_payload.action !== ticket.payload.action) {
          mismatches.push({
            field:    "action",
            ticket:   ticket.payload.action,
            received: action_payload.action
          });
        }
      }

      if (mismatches.length > 0) {
        // Audit the mismatch — best-effort
        await supabase
          .from("audit_logs")
          .insert({
            execution_id: ticket.execution_id,
            event_type:   "GATEWAY_PAYLOAD_MISMATCH",
            actor:        "EXECUTIA_GATEWAY",
            message:      "Action payload does not match authorized ticket payload.",
            payload:      { ticket_id, mismatches, ticket_payload: ticket.payload, action_payload }
          })
          .catch(err => console.error("GATEWAY_MISMATCH_AUDIT_FAILED:", err.message));

        return json(res, 403, {
          ok:         false,
          error:      "GATEWAY_PAYLOAD_MISMATCH",
          message:    "Action payload does not match the authorized ticket. Execution not permitted.",
          mismatches
        });
      }
    }
    const { data: consumed, error: consumeError } = await supabase
      .from("execution_tickets")
      .update({ status: "USED", used_at: now })
      .eq("ticket_id", ticket_id)
      .eq("status", "NOT_USED")      // concurrent-safe guard
      .select("id, ticket_id, status, used_at")
      .single();

    if (consumeError || !consumed) {
      return json(res, 409, { ok: false, error: "TICKET_CONSUME_FAILED",
        message: consumeError?.message || "Ticket was consumed concurrently." });
    }

    // Audit — best-effort
    await supabase
      .from("audit_logs")
      .insert({
        execution_id: ticket.execution_id,
        event_type:   "EXECUTION_TICKET_CONSUMED",
        actor:        "EXECUTIA_GATEWAY",
        message:      `Execution ticket consumed for action: ${ticket.allowed_action}`,
        payload:      { ticket_id, allowed_action: ticket.allowed_action, action_payload: action_payload || {} }
      })
      .catch(err => console.error("GATEWAY_AUDIT_FAILED:", err.message));

    // Ledger
    await writeLedgerEvent({
      execution_id: ticket.execution_id,
      event_type:   "EXECUTION_TICKET_CONSUMED",
      actor:        "EXECUTIA_GATEWAY",
      payload:      { ticket_id, allowed_action: ticket.allowed_action, action_payload: action_payload || {} }
    }).catch(err => console.error("LEDGER_GATEWAY_FAILED:", err.message));

    return json(res, 200, {
      ok:             true,
      source:         "EXECUTIA_GATEWAY",
      status:         "ACTION_ALLOWED",
      execution_id:   ticket.execution_id,
      allowed_action: ticket.allowed_action
    });

  } catch (err) {
    return json(res, 500, { ok: false, error: "GATEWAY_ENGINE_ERROR", message: err.message });
  }
}
