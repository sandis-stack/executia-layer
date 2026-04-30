/**
 * EXECUTIA™ — /api/v1/validate-project
 *
 * Project validation endpoint.
 * Uses the full EXECUTIA engine pipeline:
 *   canonical context → rule loader → rule evaluator → decision engine
 *
 * This is not a payment executor. It validates whether execution is permitted.
 * APPROVE / ESCALATE / BLOCK — with full reason_codes and audit trail.
 */

import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { hashPayload }           from "../../services/hash.js";
import { loadRules }             from "../../engine/rule-loader.js";
import { evaluateRules }         from "../../engine/rule-evaluator.js";
import { makeDecision }          from "../../engine/decision-engine.js";
import { writeLedgerEvent }      from "../services/ledger.js";

function json(res, status, payload) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "https://executia.io");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  return res.status(status).json(payload);
}

function normalizeBoolean(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

/**
 * Build canonical project context.
 * Maps snake_case / camelCase input to canonical fields.
 * Sets legalBlock = false by default (must be explicitly true to block).
 */
function buildCanonicalContext(input) {
  return {
    eventType:        input.event_type     || input.eventType     || "project.validation",
    organizationId:   input.organization_id|| input.organizationId|| null,
    projectId:        input.project_id     || input.projectId     || null,
    amount:           input.amount  != null ? Number(input.amount) : null,
    currency:         input.currency        || "EUR",
    supplierVerified: normalizeBoolean(input.supplier_verified ?? input.supplierVerified),
    contractValid:    normalizeBoolean(input.contract_valid    ?? input.contractValid),
    invoice_attached: normalizeBoolean(input.invoice_attached  ?? input.invoiceAttached),
    legalBlock:       normalizeBoolean(input.legal_block       ?? input.legalBlock),
    responsible_party: input.responsible_party || input.responsibleParty || null,
  };
}

function validateRequiredFields(ctx) {
  const missing = [];
  if (!ctx.projectId)        missing.push("PROJECT_ID_REQUIRED");
  if (!ctx.organizationId)   missing.push("ORGANIZATION_ID_REQUIRED");
  if (!ctx.responsible_party) missing.push("RESPONSIBLE_PARTY_REQUIRED");
  if (!ctx.amount || ctx.amount <= 0) missing.push("VALID_AMOUNT_REQUIRED");
  if (!ctx.currency)         missing.push("CURRENCY_REQUIRED");
  return missing;
}

/**
 * Fallback rule evaluation for project context.
 * Used when execution_rules table has no matching rules for this event_type.
 * Maps canonical fields to blockers/escalations/reason_codes.
 */
function evaluateProjectFallback(ctx) {
  const reason_codes = [];
  const blockers     = [];
  const escalations  = [];

  if (ctx.legalBlock) {
    blockers.push("LEGAL_BLOCK_ACTIVE");
  } else {
    reason_codes.push("NO_LEGAL_BLOCK");
  }

  if (!ctx.supplierVerified) {
    blockers.push("SUPPLIER_NOT_VERIFIED");
  } else {
    reason_codes.push("SUPPLIER_VERIFIED");
  }

  if (!ctx.contractValid) {
    blockers.push("CONTRACT_NOT_VALID");
  } else {
    reason_codes.push("CONTRACT_VALID");
  }

  if (!ctx.invoice_attached) {
    escalations.push("INVOICE_NOT_ATTACHED");
  } else {
    reason_codes.push("INVOICE_ATTACHED");
  }

  if (ctx.amount >= 10000) {
    escalations.push("HIGH_VALUE_REQUIRES_OPERATOR_REVIEW");
  }

  if (blockers.length > 0) {
    return { decision: "BLOCK",    status: "BLOCKED",       reason_codes, blockers, escalations };
  }
  if (escalations.length > 0) {
    return { decision: "ESCALATE", status: "PENDING_REVIEW", reason_codes, blockers, escalations };
  }
  return   { decision: "APPROVE",  status: "VALIDATED",      reason_codes, blockers, escalations };
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return json(res, 405, { ok: false, error: "METHOD_NOT_ALLOWED" });

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return json(res, 500, { ok: false, error: "SUPABASE_ENV_MISSING" });

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  try {
    const ctx = buildCanonicalContext(req.body || {});

    // Required field validation — fast fail
    const missing = validateRequiredFields(ctx);
    if (missing.length > 0) {
      return json(res, 400, { ok: false, error: "MISSING_REQUIRED_FIELDS", missing });
    }

    // ── Idempotency: prevent duplicate validations for same context ───────────
    const idempotency_key = crypto
      .createHash("sha256")
      .update(JSON.stringify({
        projectId:        ctx.projectId,
        organizationId:   ctx.organizationId,
        eventType:        ctx.eventType,
        amount:           ctx.amount,
        currency:         ctx.currency,
        supplierVerified: ctx.supplierVerified,
        contractValid:    ctx.contractValid,
        legalBlock:       ctx.legalBlock,
        responsible_party: ctx.responsible_party
      }))
      .digest("hex")
      .slice(0, 32);

    const { data: existingValidation } = await supabase
      .from("audit_logs")
      .select("payload, created_at")
      .eq("event_type", "PROJECT_VALIDATION_COMPLETED")
      .contains("payload", { idempotency_key })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Return cached result if validated within last 5 minutes
    if (existingValidation?.payload?.idempotency_key === idempotency_key) {
      const age = Date.now() - new Date(existingValidation.created_at).getTime();
      if (age < 5 * 60 * 1000) {
        const cached = existingValidation.payload;
        return json(res, 200, {
          ok:              true,
          source:          "EXECUTIA_PROJECT_VALIDATOR",
          idempotent:      true,
          decision:        cached.decision,
          status:          cached.status,
          reason_codes:    cached.reason_codes,
          blockers:        cached.blockers     || [],
          escalations:     cached.escalations  || [],
          truth_hash:      cached.truth_hash,
          decision_source: cached.decision_source
        });
      }
    }

    let decision, status, reason_codes, blockers = [], escalations = [];
    let decision_source = "fallback";

    // ── Engine path: load rules from execution_rules table ────────────────────
    try {
      const rules = await loadRules(supabase, ctx.eventType, ctx.projectId, ctx.organizationId);

      if (rules && rules.length > 0) {
        const { results, invalidRules } = evaluateRules(rules, ctx);

        if (invalidRules.length > 0) {
          console.warn("[EXECUTIA] Invalid rules detected:", JSON.stringify(invalidRules));
        }

        const engineDecision = makeDecision(ctx, results);
        decision        = engineDecision.decision;
        reason_codes    = engineDecision.reason_codes;
        decision_source = "rule_engine";

        status = decision === "APPROVE"   ? "VALIDATED" :
                 decision === "ESCALATE"  ? "PENDING_REVIEW" : "BLOCKED";
      } else {
        throw new Error("NO_RULES_LOADED");
      }
    } catch (ruleErr) {
      // Fallback: no rules in DB yet, or rule engine error
      console.warn("[EXECUTIA] Rule engine fallback:", ruleErr.message);
      const fallback = evaluateProjectFallback(ctx);
      decision        = fallback.decision;
      status          = fallback.status;
      reason_codes    = fallback.reason_codes;
      blockers        = fallback.blockers;
      escalations     = fallback.escalations;
      decision_source = "fallback";
    }

    const truth_hash = hashPayload({ ctx, decision, status, reason_codes, decision_source });

    // ── Audit log — best-effort ───────────────────────────────────────────────
    await supabase
      .from("audit_logs")
      .insert({
        execution_id: null,
        event_type:   "PROJECT_VALIDATION_COMPLETED",
        actor:        "EXECUTIA_PROJECT_VALIDATOR",
        message:      `Project validation completed: ${decision}. Source: ${decision_source}.`,
        payload:      { ctx, decision, status, reason_codes, blockers, escalations, truth_hash, decision_source, idempotency_key }
      })
      .catch(err => console.error("VALIDATE_AUDIT_FAILED:", err.message));

    // ── Ledger — best-effort ──────────────────────────────────────────────────
    await writeLedgerEvent({
      execution_id: null,
      event_type:   "PROJECT_VALIDATION_COMPLETED",
      actor:        "EXECUTIA_PROJECT_VALIDATOR",
      payload:      { projectId: ctx.projectId, organizationId: ctx.organizationId,
                      eventType: ctx.eventType, decision, status, decision_source }
    }).catch(err => console.error("VALIDATE_LEDGER_FAILED:", err.message));

    return json(res, 200, {
      ok:              true,
      source:          "EXECUTIA_PROJECT_VALIDATOR",
      decision,
      status,
      reason_codes,
      blockers,
      escalations,
      truth_hash,
      decision_source
    });

  } catch (err) {
    return json(res, 500, { ok: false, error: "PROJECT_VALIDATION_FAILED", message: err.message });
  }
}
