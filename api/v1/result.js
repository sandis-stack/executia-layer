import { checkRateLimit } from "../services/rate-limit.js";
/**
 * EXECUTIA™ — /api/v1/result
 *
 * Provider callback: records what actually happened in the real world.
 * Called by bank, ERP, mock provider, or webhook after execution.
 *
 * Does NOT verify — that is /api/v1/reconcile.
 * This endpoint only records. Truth is compared separately.
 */

import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

function json(res, status, payload) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "https://executia.io");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  return res.status(status).json(payload);
}

const ALLOWED_STATUSES = ["COMPLETED", "FAILED", "PARTIAL", "PENDING", "TIMEOUT"];

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return json(res, 405, { ok: false, error: "METHOD_NOT_ALLOWED" });

  const rateCheck = await checkRateLimit(req, "result");
  if (rateCheck) return json(res, rateCheck.status, rateCheck.body);

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return json(res, 500, { ok: false, error: "SUPABASE_ENV_MISSING" });

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  try {
    const {
      execution_id,
      ticket_id,
      provider,
      provider_tx_id,
      provider_status,
      amount,
      currency,
      receiver
    } = req.body || {};

    if (!execution_id || !provider || !provider_status) {
      return json(res, 400, { ok: false, error: "MISSING_RESULT_FIELDS",
        required: ["execution_id", "provider", "provider_status"] });
    }

    const normalizedStatus = String(provider_status).toUpperCase();
    if (!ALLOWED_STATUSES.includes(normalizedStatus)) {
      return json(res, 400, { ok: false, error: "INVALID_PROVIDER_STATUS", allowed: ALLOWED_STATUSES });
    }

    // ── Idempotency: prevent duplicate provider callbacks ─────────────────────
    const idempotencySource = provider_tx_id
      ? `${execution_id}:${provider}:${provider_tx_id}`
      : `${execution_id}:${provider}:${normalizedStatus}:${amount || ""}`;

    const idempotency_key = crypto
      .createHash("sha256")
      .update(idempotencySource)
      .digest("hex")
      .slice(0, 32);

    const { data: existingResult } = await supabase
      .from("execution_results")
      .select("id, execution_id, provider, provider_status, verified, created_at")
      .eq("idempotency_key", idempotency_key)
      .maybeSingle();

    if (existingResult) {
      return json(res, 200, {
        ok:          true,
        source:      "EXECUTIA_ENGINE",
        idempotent:  true,
        result:      existingResult
      });
    }

    // Verify execution exists
    const { data: execution, error: execError } = await supabase
      .from("executions")
      .select("id, result, status, amount")
      .eq("id", execution_id)
      .maybeSingle();

    if (execError) return json(res, 500, { ok: false, error: "EXECUTION_READ_FAILED" });
    if (!execution) return json(res, 404, { ok: false, error: "EXECUTION_NOT_FOUND", execution_id });

    // Detect discrepancy (if amounts differ)
    const approvedAmount = execution.amount;
    const discrepancy    = approvedAmount != null && amount != null
      && Number(amount) !== Number(approvedAmount);

    // Detect partial execution (provider delivered less than approved)
    const partial_execution = approvedAmount != null && amount != null &&
      Number(amount) > 0 && Number(amount) < Number(approvedAmount);

    const { data, error } = await supabase
      .from("execution_results")
      .insert({
        execution_id,
        ticket_id:       ticket_id     || null,
        provider:        provider.toUpperCase(),
        provider_tx_id:  provider_tx_id || null,
        provider_status: normalizedStatus,
        amount:          amount        || null,
        currency:        currency      || "EUR",
        receiver:        receiver      || null,
        discrepancy,
        discrepancy_note: discrepancy
          ? `Approved: ${approvedAmount}, provider reported: ${amount}`
          : null,
        partial_execution,
        partial_note: partial_execution
          ? `Partial: approved ${approvedAmount}, received ${amount}`
          : null,
        idempotency_key,
        payload: req.body
      })
      .select("id, execution_id, provider, provider_status, verified, discrepancy, created_at")
      .single();

    if (error) {
      // Error path — ledger + audit
      await supabase
        .from("audit_logs")
        .insert({
          execution_id,
          event_type: "RESULT_RECORD_FAILED",
          actor:      provider?.toUpperCase() || "PROVIDER",
          message:    "Provider result could not be recorded.",
          payload:    { provider_status: normalizedStatus, error: error.message }
        })
        .catch(() => null);

      return json(res, 500, { ok: false, error: "RESULT_INSERT_FAILED", message: error.message });
    }

    // Audit — best-effort
    await supabase
      .from("audit_logs")
      .insert({
        execution_id,
        event_type: discrepancy ? "PROVIDER_RESULT_DISCREPANCY" : "PROVIDER_RESULT_RECORDED",
        actor:      provider.toUpperCase(),
        message:    `Provider result received: ${normalizedStatus}${discrepancy ? ". DISCREPANCY DETECTED." : ""}`,
        payload:    { provider_tx_id, provider_status: normalizedStatus, amount, currency, discrepancy }
      })
      .catch(err => console.error("RESULT_AUDIT_FAILED:", err.message));

    return json(res, 200, {
      ok:      true,
      source:  "EXECUTIA_ENGINE",
      result:  data
    });

  } catch (err) {
    return json(res, 500, { ok: false, error: "RESULT_ENGINE_ERROR", message: err.message });
  }
}
