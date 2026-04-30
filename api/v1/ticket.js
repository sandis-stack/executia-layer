/**
 * EXECUTIA™ — /api/v1/ticket
 *
 * Issues an execution ticket for an APPROVED + COMMITTED execution.
 * Ticket is required by /api/v1/gateway before any real-world action proceeds.
 *
 * Principle: APPROVED is not execution. TICKET is execution permission.
 */

import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { writeLedgerEvent } from "../services/ledger.js";
import { signPayload } from "../../services/signature.js";

function json(res, status, payload) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "https://executia.io");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  return res.status(status).json(payload);
}

function createTicketId() {
  return "xt_" + crypto.randomBytes(16).toString("hex");
}

// Deterministic key sort for payload hashing
function sortKeys(obj) {
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) return obj;
  return Object.keys(obj).sort().reduce((acc, k) => {
    acc[k] = sortKeys(obj[k]);
    return acc;
  }, {});
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return json(res, 405, { ok: false, error: "METHOD_NOT_ALLOWED" });

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return json(res, 500, { ok: false, error: "SUPABASE_ENV_MISSING" });

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  try {
    const { execution_id, allowed_action, payload } = req.body || {};

    if (!execution_id || !allowed_action) {
      return json(res, 400, { ok: false, error: "MISSING_TICKET_FIELDS" });
    }

    // Verify execution: must be APPROVED + COMMITTED
    const { data: execution, error: execError } = await supabase
      .from("executions")
      .select("id, result, status, truth_hash")
      .eq("id", execution_id)
      .maybeSingle();

    if (execError) return json(res, 500, { ok: false, error: "EXECUTION_READ_FAILED", message: execError.message });
    if (!execution) return json(res, 404, { ok: false, error: "EXECUTION_NOT_FOUND", execution_id });

    if (execution.result !== "APPROVED" || execution.status !== "COMMITTED") {
      return json(res, 403, {
        ok:      false,
        error:   "TICKET_FORBIDDEN",
        message: "Ticket can only be issued for APPROVED and COMMITTED executions.",
        current: { result: execution.result, status: execution.status }
      });
    }

    // Check: no active ticket already exists for this execution
    const { data: existingTicket } = await supabase
      .from("execution_tickets")
      .select("ticket_id, status, valid_until")
      .eq("execution_id", execution_id)
      .eq("status", "NOT_USED")
      .maybeSingle()
      .catch(() => ({ data: null }));

    if (existingTicket && new Date(existingTicket.valid_until) > new Date()) {
      return json(res, 409, {
        ok:      false,
        error:   "TICKET_ALREADY_ACTIVE",
        message: "An active ticket already exists for this execution.",
        ticket_id:   existingTicket.ticket_id,
        valid_until: existingTicket.valid_until
      });
    }

    const ticket_id   = createTicketId();
    const valid_until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const now         = new Date().toISOString();

    // HMAC signature — signed with TICKET_SIGNING_SECRET
    // sign(execution_id:allowed_action:amount:currency:valid_until)
    const signingSecret  = process.env.TICKET_SIGNING_SECRET;
    const signingPayload = [execution_id, allowed_action,
      payload?.amount || "", payload?.currency || "EUR", valid_until].join(":");
    const ticket_signature = signingSecret
      ? signPayload(signingPayload, signingSecret)
      : null;

    if (!signingSecret) {
      console.warn("[EXECUTIA] TICKET_SIGNING_SECRET not set — ticket issued without signature.");
    }

    // Compute expected payload hash — stored for gateway verification
    const expected_payload_hash = payload && Object.keys(payload).length > 0
      ? crypto
          .createHash("sha256")
          .update(JSON.stringify(sortKeys(payload)))
          .digest("hex")
      : null;

    const { data: ticket, error: insertError } = await supabase
      .from("execution_tickets")
      .insert({
        ticket_id,
        execution_id,
        allowed_action,
        valid_until,
        status:                "NOT_USED",
        payload:               payload || {},
        expected_payload_hash: expected_payload_hash || null,
        ticket_signature:      ticket_signature      || null
      })
      .select("id, ticket_id, execution_id, allowed_action, status, valid_until, created_at")
      .single();

    if (insertError) {
      return json(res, 500, { ok: false, error: "TICKET_CREATE_FAILED", message: insertError.message });
    }

    // Audit — best-effort
    await supabase
      .from("audit_logs")
      .insert({
        execution_id,
        event_type: "EXECUTION_TICKET_ISSUED",
        actor:      "EXECUTIA_ENGINE",
        message:    `Execution ticket issued for action: ${allowed_action}`,
        payload:    { ticket_id, allowed_action, valid_until }
      })
      .catch(err => console.error("TICKET_AUDIT_FAILED:", err.message));

    // Ledger
    await writeLedgerEvent({
      execution_id,
      event_type: "TICKET_ISSUED",
      actor:      "EXECUTIA_ENGINE",
      payload:    { ticket_id, allowed_action, valid_until }
    }).catch(err => console.error("LEDGER_TICKET_FAILED:", err.message));

    return json(res, 200, {
      ok:     true,
      source: "EXECUTIA_ENGINE",
      ticket
    });

  } catch (err) {
    return json(res, 500, { ok: false, error: "TICKET_ENGINE_ERROR", message: err.message });
  }
}
