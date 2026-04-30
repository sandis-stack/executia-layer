import { checkRateLimit } from "../services/rate-limit.js";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { writeLedgerEvent }  from "../services/ledger.js";
import { loadRules }         from "../../engine/rule-loader.js";
import { evaluateRules }     from "../../engine/rule-evaluator.js";
import { makeDecision }      from "../../engine/decision-engine.js";

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_ENV_MISSING");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function createTruthHash(payload) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
}

// Idempotency key: hash of the stable input fields
function createIdempotencyKey(body) {
  const stable = {
    intended_result:     body.intended_result     || null,
    responsible_party:   body.responsible_party   || null,
    required_validation: body.required_validation || null,
    current_state:       body.current_state       || null,
    // Legacy fields
    amount:   body.amount   || null,
    currency: body.currency || null,
  };
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(stable))
    .digest("hex")
    .slice(0, 32);
}

// Fallback logic (used when rule engine is unavailable)
function decideFallback(body) {
  const { intended_result, responsible_party, required_validation, current_state } = body;

  // New schema path
  if (intended_result !== undefined) {
    if (!intended_result || !responsible_party) {
      return { result: "BLOCKED", reason: "MISSING_REQUIRED_FIELDS", source: "fallback" };
    }
    if (!required_validation) {
      return { result: "BLOCKED", reason: "MISSING_VALIDATION",       source: "fallback" };
    }
    if (current_state !== "CONFIRMED") {
      return { result: "REVIEW",  reason: "STATE_NOT_CONFIRMED",      source: "fallback" };
    }
    return { result: "APPROVED", reason: "ALL_CONDITIONS_MET",       source: "fallback" };
  }

  // Legacy amount-based path (from dashboard RUN CHECK button)
  const amount = Number(body.amount || 0);
  const ctx    = body.context || {};
  if (ctx.legalBlock === true) return { result: "BLOCKED",  reason: "LEGAL_BLOCK",          source: "fallback" };
  if (amount <= 0)             return { result: "BLOCKED",  reason: "INVALID_AMOUNT",        source: "fallback" };
  if (amount >= 10000)         return { result: "REVIEW",   reason: "HIGH_VALUE_REVIEW",     source: "fallback" };
  return                              { result: "APPROVED", reason: "AMOUNT_WITHIN_LIMITS",  source: "fallback" };
}

function decisionToStatus(result) {
  if (result === "APPROVED") return { validation: "PASSED",   status: "COMMITTED" };
  if (result === "BLOCKED")  return { validation: "FAILED",   status: "BLOCKED" };
  return                            { validation: "REQUIRED", status: "PENDING_REVIEW" };
}

// ──────────────────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "https://executia.io");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  const rateCheck = await checkRateLimit(req, "execute");
  if (rateCheck) return res.status(rateCheck.status).json(rateCheck.body);

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ ok: false, error: "SUPABASE_ENV_MISSING" });
  }

  try {
    const supabase = getSupabase();
    const body     = req.body || {};
    const now      = new Date().toISOString();

    // ── Idempotency check ─────────────────────────────────────────────────────
    const idempotencyKey = createIdempotencyKey(body);

    const { data: existing } = await supabase
      .from("executions")
      .select("id, result, validation, status, truth_hash, created_at")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existing) {
      return res.status(200).json({
        ok:         true,
        source:     "EXECUTIA_ENGINE",
        idempotent: true,
        result:     existing.result,
        validation: existing.validation,
        status:     existing.status,
        registry:   "COMMITTED",
        execution:  existing
      });
    }

    // ── Rules evaluation via engine pipeline ──────────────────────────────────
    let decisionResult = null;

    try {
      const eventType      = body.intended_result ? "execution.decision" : "payment";
      const organizationId = body.organization_id || null;
      const projectId      = body.project_id      || null;

      const rules = await loadRules(supabase, eventType, projectId, organizationId);

      if (rules && rules.length > 0) {
        const engineCtx = {
          // Map body fields to canonical context fields
          eventType,
          organizationId,
          projectId,
          amount:           body.amount     != null ? Number(body.amount) : null,
          currency:         body.currency   || "EUR",
          supplierVerified: body.supplier_verified ?? null,
          contractValid:    body.contract_valid    ?? null,
          legalBlock:       body.context?.legalBlock === true,
          // Extended fields
          intended_result:   body.intended_result      || null,
          responsible_party: body.responsible_party    || null,
          required_validation: body.required_validation || null,
          current_state:     body.current_state        || null,
        };

        const { results, invalidRules } = evaluateRules(rules, engineCtx);
        if (invalidRules.length > 0) {
          console.warn("[EXECUTIA] Invalid rules skipped:", JSON.stringify(invalidRules));
        }

        const engineDecision = makeDecision(engineCtx, results);
        const mapped = engineDecision.decision === "APPROVE"   ? "APPROVED"  :
                       engineDecision.decision === "ESCALATE"  ? "REVIEW"    : "BLOCKED";

        decisionResult = {
          result:         mapped,
          reason:         engineDecision.reason_codes.join(", ") || "ENGINE_DECISION",
          source:         "rule_engine"
        };
      }
    } catch (ruleErr) {
      console.warn("[EXECUTIA] Rule engine unavailable, using fallback:", ruleErr.message);
    }

    // Fall back if engine path unavailable or returned no result
    if (!decisionResult) {
      decisionResult = decideFallback(body);
    }

    const { result, reason, source: decisionSource } = decisionResult;
    const { validation, status } = decisionToStatus(result);

    const proofPayload = { ...body, result, validation, status, reason, timestamp: now };
    const truth_hash   = createTruthHash(proofPayload);

    // ── Registry insert ───────────────────────────────────────────────────────
    const { data, error } = await supabase
      .from("executions")
      .insert({
        result,
        validation,
        status,
        truth_hash,
        idempotency_key: idempotencyKey,
        payload: proofPayload
      })
      .select("id, result, validation, status, truth_hash, created_at")
      .single();

    if (error) {
      // Failure audit — best-effort
      await supabase
        .from("audit_logs")
        .insert({
          execution_id: null,
          event_type:   "EXECUTION_REGISTRY_FAILED",
          actor:        "EXECUTIA_ENGINE",
          message:      "Execution could not be committed to registry.",
          payload:      { result, validation, status, truth_hash, reason, error: error.message }
        })
        .catch(err => console.error("AUDIT_FAILURE_LOG_FAILED:", err.message));

      return res.status(500).json({
        ok: false, error: "REGISTRY_COMMIT_FAILED", message: error.message
      });
    }

    // ── Success audit — best-effort ───────────────────────────────────────────
    await supabase
      .from("audit_logs")
      .insert({
        execution_id: data.id,
        event_type:   "EXECUTION_DECISION_COMMITTED",
        actor:        "EXECUTIA_ENGINE",
        message:      `Execution decision ${result} recorded in registry. Source: ${decisionSource}.`,
        payload:      { result, validation, status, truth_hash, reason, decision_source: decisionSource }
      })
      .catch(err => console.error("AUDIT_LOG_FAILED:", err.message));

    // ── Ledger (append-only chain) ────────────────────────────────────────────
    await writeLedgerEvent({
      execution_id: data.id,
      event_type:   "EXECUTION_DECISION_COMMITTED",
      actor:        "EXECUTIA_ENGINE",
      payload:      { result, validation, status, truth_hash, reason, decision_source: decisionSource }
    }).catch(err => console.error("LEDGER_WRITE_FAILED:", err.message));

    // ── Ticket issuance is a separate explicit step via POST /api/v1/ticket ──
    // Execute only records the decision. APPROVED is not execution.

    return res.status(200).json({
      ok:         true,
      source:     "EXECUTIA_ENGINE",
      result,
      validation,
      status,
      registry:   "COMMITTED",
      execution:  data
    });

  } catch (err) {
    return res.status(500).json({
      ok: false, error: "ENGINE_EXECUTION_FAILED", message: err.message || String(err)
    });
  }
}
