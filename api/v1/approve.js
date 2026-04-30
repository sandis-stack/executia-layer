/**
 * EXECUTIA™ — /api/v1/approve
 *
 * Multi-actor approval endpoint.
 * Records an actor's decision (APPROVED | REJECTED | ABSTAIN) for an execution.
 *
 * Approval chain:
 *   execution requires N approvals (from execution_rules.min_approvals)
 *   → each actor signs their decision
 *   → when threshold met → ticket issuance is permitted
 *
 * Principle: segregation of duties. No single actor controls execution.
 */

import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { writeLedgerEvent } from "../services/ledger.js";
import { signPayload } from "../../services/signature.js";

function json(res, status, payload) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "https://executia.io");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-operator-token");
  return res.status(status).json(payload);
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return json(res, 500, { ok: false, error: "SUPABASE_ENV_MISSING" });

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // ── GET: read approval status for an execution ────────────────────────────
  if (req.method === "GET") {
    const execution_id = req.query?.execution_id;
    if (!execution_id) return json(res, 400, { ok: false, error: "EXECUTION_ID_REQUIRED" });

    const { data: approvals, error } = await supabase
      .from("execution_approvals")
      .select("id, actor_id, actor_role, decision, reason, created_at")
      .eq("execution_id", execution_id)
      .order("created_at", { ascending: true });

    if (error) return json(res, 500, { ok: false, error: "APPROVALS_READ_FAILED", message: error.message });

    const approved  = (approvals || []).filter(a => a.decision === "APPROVED").length;
    const rejected  = (approvals || []).filter(a => a.decision === "REJECTED").length;

    return json(res, 200, {
      ok:         true,
      source:     "EXECUTIA_ENGINE",
      execution_id,
      total:      (approvals || []).length,
      approved,
      rejected,
      approvals:  approvals || []
    });
  }

  // ── POST: record an approval decision ─────────────────────────────────────
  if (req.method !== "POST") return json(res, 405, { ok: false, error: "METHOD_NOT_ALLOWED" });

  // Operator token required
  const token = req.headers["x-operator-token"];
  if (!token || token !== process.env.OPERATOR_TOKEN) {
    return json(res, 401, { ok: false, error: "UNAUTHORIZED_OPERATOR" });
  }

  try {
    const { execution_id, actor_id, actor_role, decision, reason } = req.body || {};

    if (!execution_id) return json(res, 400, { ok: false, error: "EXECUTION_ID_REQUIRED" });
    if (!actor_id)     return json(res, 400, { ok: false, error: "ACTOR_ID_REQUIRED" });
    if (!decision)     return json(res, 400, { ok: false, error: "DECISION_REQUIRED" });

    const normalizedDecision = String(decision).toUpperCase();
    if (!["APPROVED", "REJECTED", "ABSTAIN"].includes(normalizedDecision)) {
      return json(res, 400, { ok: false, error: "INVALID_DECISION",
        allowed: ["APPROVED", "REJECTED", "ABSTAIN"] });
    }

    // Verify execution exists
    const { data: execution, error: execError } = await supabase
      .from("executions")
      .select("id, result, status")
      .eq("id", execution_id)
      .maybeSingle();

    if (execError) return json(res, 500, { ok: false, error: "EXECUTION_READ_FAILED" });
    if (!execution) return json(res, 404, { ok: false, error: "EXECUTION_NOT_FOUND", execution_id });

    // Prevent duplicate approval from same actor
    const { data: existingApproval } = await supabase
      .from("execution_approvals")
      .select("id, decision")
      .eq("execution_id", execution_id)
      .eq("actor_id", actor_id)
      .maybeSingle();

    if (existingApproval) {
      return json(res, 409, {
        ok:               false,
        error:            "APPROVAL_ALREADY_RECORDED",
        existing_decision: existingApproval.decision
      });
    }

    const now = new Date().toISOString();

    // Sign the approval — actor accountability
    const signingSecret = process.env.TICKET_SIGNING_SECRET;
    const approvalSigPayload = `${execution_id}:${actor_id}:${normalizedDecision}:${now}`;
    const signature = signingSecret
      ? signPayload(approvalSigPayload, signingSecret)
      : null;

    const { data: approval, error: insertError } = await supabase
      .from("execution_approvals")
      .insert({
        execution_id,
        actor_id,
        actor_role: actor_role || "approver",
        decision:   normalizedDecision,
        reason:     reason || null,
        signature:  signature || null
      })
      .select("id, actor_id, actor_role, decision, reason, created_at")
      .single();

    if (insertError) {
      return json(res, 500, { ok: false, error: "APPROVAL_INSERT_FAILED", message: insertError.message });
    }

    // Count current approvals
    const { data: allApprovals } = await supabase
      .from("execution_approvals")
      .select("decision")
      .eq("execution_id", execution_id);

    const approvedCount = (allApprovals || []).filter(a => a.decision === "APPROVED").length;
    const rejectedCount = (allApprovals || []).filter(a => a.decision === "REJECTED").length;

    // Audit
    await supabase
      .from("audit_logs")
      .insert({
        execution_id,
        event_type: `APPROVAL_${normalizedDecision}`,
        actor:      actor_id,
        message:    `${actor_id} recorded ${normalizedDecision} for execution.`,
        payload:    { actor_role, decision: normalizedDecision, reason, approved_count: approvedCount }
      })
      .catch(err => console.error("APPROVAL_AUDIT_FAILED:", err.message));

    // Ledger
    await writeLedgerEvent({
      execution_id,
      event_type: `APPROVAL_${normalizedDecision}`,
      actor:      actor_id,
      payload:    { actor_role: actor_role || "approver", decision: normalizedDecision, reason,
                    approved_count: approvedCount, rejected_count: rejectedCount }
    }).catch(err => console.error("APPROVAL_LEDGER_FAILED:", err.message));

    return json(res, 200, {
      ok:             true,
      source:         "EXECUTIA_ENGINE",
      approval,
      approved_count: approvedCount,
      rejected_count: rejectedCount,
      // Signal if REJECTED → execution cannot proceed
      execution_blocked: rejectedCount > 0
    });

  } catch (err) {
    return json(res, 500, { ok: false, error: "APPROVAL_ENGINE_ERROR", message: err.message });
  }
}
