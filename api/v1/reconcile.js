/**
 * EXECUTIA™ — /api/v1/reconcile
 *
 * Reconciliation: compares engine decision against provider result.
 * This is the verification layer — the moment EXECUTIA becomes a truth system.
 *
 * DECISION ≠ TRUTH
 * EXECUTION ≠ TRUTH
 * VERIFIED RESULT = TRUTH
 *
 * GET ?execution_id=... → returns reconciliation state
 */

import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { writeLedgerEvent } from "../services/ledger.js";

function json(res, status, payload) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "https://executia.io");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  return res.status(status).json(payload);
}

function hash(obj) {
  return crypto.createHash("sha256").update(JSON.stringify(obj)).digest("hex");
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET")    return json(res, 405, { ok: false, error: "METHOD_NOT_ALLOWED" });

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return json(res, 500, { ok: false, error: "SUPABASE_ENV_MISSING" });

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  try {
    const execution_id = req.query?.execution_id;
    if (!execution_id) return json(res, 400, { ok: false, error: "MISSING_EXECUTION_ID" });

    // Read execution
    const { data: execution, error: execError } = await supabase
      .from("executions")
      .select("id, result, status, truth_hash, created_at")
      .eq("id", execution_id)
      .maybeSingle();

    if (execError) return json(res, 500, { ok: false, error: "EXECUTION_READ_FAILED" });
    if (!execution) return json(res, 404, { ok: false, error: "EXECUTION_NOT_FOUND", execution_id });

    // Read latest provider result
    const { data: result } = await supabase
      .from("execution_results")
      .select("id, provider, provider_status, provider_tx_id, amount, currency, verified, discrepancy, discrepancy_note, created_at")
      .eq("execution_id", execution_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Read consumed ticket (for allowed_action + amount comparison)
    const { data: ticket } = await supabase
      .from("execution_tickets")
      .select("ticket_id, allowed_action, amount, currency, payload")
      .eq("execution_id", execution_id)
      .eq("status", "USED")
      .maybeSingle()
      .catch(() => ({ data: null }));

    // No provider result yet
    if (!result) {
      return json(res, 200, {
        ok:             true,
        source:         "EXECUTIA_ENGINE",
        execution_id,
        execution:      execution.result,
        reconciliation: "NO_PROVIDER_RESULT",
        verified:       false
      });
    }

    // ── Enhanced reconciliation: amount + currency + receiver + partial ───────
    const statusMatch  = execution.result === "APPROVED" && result.provider_status === "COMPLETED";
    const amountMatch  = ticket?.amount == null || result.amount == null ||
                         Number(result.amount) === Number(ticket.amount);
    const currencyMatch = !ticket?.currency || !result.currency ||
                          result.currency.toUpperCase() === ticket.currency.toUpperCase();
    const receiverMatch = !execution.receiver || !result.receiver ||
                          execution.receiver === result.receiver;
    const noPartial    = !result.partial_execution;

    const verified      = statusMatch && amountMatch && currencyMatch &&
                          receiverMatch && noPartial && !result.discrepancy;

    const reconciliation_detail = {
      status_match:        statusMatch,
      amount_match:        amountMatch,
      currency_match:      currencyMatch,
      receiver_match:      receiverMatch,
      partial_execution:   result.partial_execution || false,
      partial_note:        result.partial_note       || null,
      discrepancy:         result.discrepancy        || false,
      ticket_amount:       ticket?.amount            || null,
      result_amount:       result.amount             || null,
      ticket_currency:     ticket?.currency          || null,
      result_currency:     result.currency           || null,
      allowed_action:      ticket?.allowed_action    || null
    };

    const now = new Date().toISOString();

    if (verified && !result.verified) {
      // Mark verified
      await supabase
        .from("execution_results")
        .update({ verified: true, verification_note: "Execution matches provider result" })
        .eq("id", result.id)
        .catch(err => console.error("VERIFY_UPDATE_FAILED:", err.message));

      // Update execution status to FINALIZED
      await supabase
        .from("executions")
        .update({ status: "FINALIZED" })
        .eq("id", execution_id)
        .catch(err => console.error("EXECUTION_FINALIZE_FAILED:", err.message));

      // Audit
      await supabase
        .from("audit_logs")
        .insert({
          execution_id,
          event_type: "RECONCILIATION_VERIFIED",
          actor:      "EXECUTIA_ENGINE",
          message:    "Execution verified against provider result.",
          payload:    { provider: result.provider, provider_status: result.provider_status,
                        provider_tx_id: result.provider_tx_id }
        })
        .catch(err => console.error("RECONCILE_AUDIT_FAILED:", err.message));

      // Ledger: LEDGER_FINALIZED
      await writeLedgerEvent({
        execution_id,
        event_type: "RECONCILIATION_VERIFIED",
        actor:      "EXECUTIA_ENGINE",
        payload:    { execution_result: execution.result, provider_status: result.provider_status, verified: true }
      }).catch(err => console.error("LEDGER_FINALIZE_FAILED:", err.message));

    } else if (!verified) {
      // Mismatch or discrepancy
      const mismatchEvent = result.discrepancy ? "RECONCILIATION_DISCREPANCY" : "RECONCILIATION_MISMATCH";

      await supabase
        .from("audit_logs")
        .insert({
          execution_id,
          event_type: mismatchEvent,
          actor:      "EXECUTIA_ENGINE",
          message:    result.discrepancy
            ? `Reconciliation discrepancy: ${result.discrepancy_note}`
            : `Mismatch: engine=${execution.result}, provider=${result.provider_status}`,
          payload: {
            execution_result:  execution.result,
            provider_status:   result.provider_status,
            discrepancy:       result.discrepancy,
            discrepancy_note:  result.discrepancy_note
          }
        })
        .catch(err => console.error("MISMATCH_AUDIT_FAILED:", err.message));
    }

    return json(res, 200, {
      ok:                   true,
      source:               "EXECUTIA_ENGINE",
      execution_id,
      execution:            execution.result,
      provider:             result.provider_status,
      verified,
      discrepancy:          result.discrepancy || false,
      discrepancy_note:     result.discrepancy_note || null,
      reconciliation_detail
    });

  } catch (err) {
    return json(res, 500, { ok: false, error: "RECONCILE_ENGINE_ERROR", message: err.message });
  }
}
