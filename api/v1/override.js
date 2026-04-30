import { checkRateLimit } from "../services/rate-limit.js";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { writeLedgerEvent } from "../services/ledger.js";

function json(res, status, payload) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "https://executia.io");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-operator-token");
  return res.status(status).json(payload);
}

function nowIso() {
  return new Date().toISOString();
}

// Accepts both APPROVE/APPROVED, BLOCK/BLOCKED, REVIEW/REVIEW_REQUIRED
function normalizeOverride(value) {
  const v = String(value || "").trim().toUpperCase();
  if (v === "APPROVE"  || v === "APPROVED")                   return "APPROVED";
  if (v === "REJECT"   || v === "REJECTED")                   return "REJECTED";
  if (v === "REVIEW"   || v === "REVIEW_REQUIRED"
                       || v === "REQUIRES_REVIEW")             return "REVIEW_REQUIRED";
  return null;
}

function defaultReason(override) {
  if (override === "APPROVED")       return "Operator confirmed execution.";
  if (override === "REJECTED")       return "Operator rejected execution.";
  if (override === "REVIEW_REQUIRED") return "Operator requested further review.";
  return "Operator control action.";
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return json(res, 405, { ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  // Operator token auth
  const token = req.headers["x-operator-token"];
  if (!token || token !== process.env.OPERATOR_TOKEN) {
    return json(res, 401, { ok: false, error: "UNAUTHORIZED_OPERATOR" });
  }

  const rateCheck = await checkRateLimit(req, "override");
  if (rateCheck) return json(res, rateCheck.status, rateCheck.body);

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return json(res, 500, { ok: false, error: "SUPABASE_ENV_MISSING" });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  try {
    const body       = req.body || {};
    const executionId = body.execution_id;
    const override   = normalizeOverride(body.override || body.action);
    const actor      = String(body.actor || body.operator || "OPERATOR").trim();
    const actorId    = String(body.actor_id   || body.actor   || "OPERATOR").trim();
    const actorRole  = String(body.actor_role || "operator").trim();
    const reason     = String(body.reason || "").trim() || defaultReason(override);

    if (!executionId) {
      return json(res, 400, { ok: false, error: "EXECUTION_ID_REQUIRED" });
    }

    if (!override) {
      return json(res, 400, {
        ok: false,
        error: "INVALID_OVERRIDE",
        allowed: ["APPROVED", "REJECTED", "REVIEW_REQUIRED"]
      });
    }

    // Read before update — capture previous state, verify existence
    const { data: existing, error: readError } = await supabase
      .from("executions")
      .select("id, result, status, operator_override")
      .eq("id", executionId)
      .maybeSingle();

    if (readError) {
      return json(res, 500, { ok: false, error: "EXECUTION_READ_FAILED", message: readError.message });
    }

    if (!existing) {
      return json(res, 404, { ok: false, error: "EXECUTION_NOT_FOUND", execution_id: executionId });
    }

    const previousResult = existing.result   || "UNKNOWN";
    const previousStatus = existing.status   || "UNKNOWN";

    // Block override if execution is already finalized
    if (previousStatus === "COMMITTED" && existing.operator_override) {
      return json(res, 409, {
        ok:               false,
        error:            "OVERRIDE_FORBIDDEN",
        reason:           "Execution is COMMITTED with an existing operator override. Registry is final.",
        current_status:   previousStatus,
        current_override: existing.operator_override
      });
    }

    // Block override if ticket has already been consumed (real-world action executed)
    const { data: consumedTicket } = await supabase
      .from("execution_tickets")
      .select("ticket_id, status, used_at")
      .eq("execution_id", executionId)
      .eq("status", "USED")
      .maybeSingle()
      .catch(() => ({ data: null }));

    if (consumedTicket) {
      return json(res, 409, {
        ok:          false,
        error:       "OVERRIDE_FORBIDDEN_TICKET_CONSUMED",
        reason:      "Execution ticket has been consumed. Real-world action has already been authorized. Override not permitted.",
        ticket_id:   consumedTicket.ticket_id,
        used_at:     consumedTicket.used_at
      });
    }
    const now = nowIso();

    // Write operator_* columns (011 migration) + update result/status
    const { data, error: updateError } = await supabase
      .from("executions")
      .update({
        operator_override: override,
        operator_reason:   reason,
        operator_actor:    actor,
        operator_at:       now,
        result:            override === "REVIEW_REQUIRED" ? "REVIEW" : override,
        status:            override === "APPROVED" ? "COMMITTED" : override === "REJECTED" ? "BLOCKED" : "PENDING_REVIEW"
      })
      .eq("id", executionId)
      .select("id, result, validation, status, operator_override, operator_actor, operator_at, truth_hash, created_at")
      .single();

    if (updateError) {
      return json(res, 500, { ok: false, error: "OVERRIDE_FAILED", message: updateError.message });
    }

    // Audit log — best-effort
    await supabase
      .from("audit_logs")
      .insert({
        execution_id: executionId,
        event_type:   "OPERATOR_OVERRIDE_RECORDED",
        actor,
        message:      `Operator override recorded: ${override}`,
        payload:      { override, reason, previous_result: previousResult, previous_status: previousStatus,
                        actor_id: actorId, actor_role: actorRole }
      })
      .catch(err => console.error("AUDIT_LOG_FAILED:", err.message));

    // Ledger
    await writeLedgerEvent({
      execution_id: executionId,
      event_type:   "OVERRIDE_RECORDED",
      actor:        actorId,
      payload:      { override, reason, previous_result: previousResult, previous_status: previousStatus,
                      actor_id: actorId, actor_role: actorRole }
    }).catch(err => console.error("LEDGER_OVERRIDE_FAILED:", err.message));

    return json(res, 200, {
      ok:               true,
      source:           "EXECUTIA_ENGINE",
      override,
      previous_result:  previousResult,
      previous_status:  previousStatus,
      execution:        data
    });

  } catch (err) {
    return json(res, 500, { ok: false, error: "OVERRIDE_SERVER_ERROR", message: err.message || String(err) });
  }
}
