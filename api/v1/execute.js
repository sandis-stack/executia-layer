import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

function getSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("SUPABASE_ENV_MISSING");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

function truthHash(payload) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
}

function makeExecutionId() {
  return "EX-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

function decide(amount, context = {}) {
  if (context.legalBlock === true) {
    return {
      status: "BLOCKED",
      authorized: false,
      hold_pending: false,
      reason: "Legal block detected"
    };
  }

  if (!amount || Number(amount) <= 0) {
    return {
      status: "BLOCKED",
      authorized: false,
      hold_pending: false,
      reason: "Invalid execution amount"
    };
  }

  if (Number(amount) >= 10000) {
    return {
      status: "REQUIRES_REVIEW",
      authorized: false,
      hold_pending: true,
      reason: "High-value execution requires review"
    };
  }

  return {
    status: "APPROVED",
    authorized: true,
    hold_pending: false,
    reason: "Execution approved"
  };
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "METHOD_NOT_ALLOWED"
    });
  }

  try {
    const supabase = getSupabase();
    const body = req.body || {};

    const amount = Number(body.amount || 0);
    const context = body.context || {};
    const decision = decide(amount, context);

    const now = new Date().toISOString();
    const execution_id = body.execution_id || makeExecutionId();

    const basePayload = {
      execution_id,
      organization_id: body.organization_id || "org_norsteel",
      session_id: body.session_id || "sess_" + Date.now(),
      project_id: body.project_id || "prj_alpha",
      event_type: body.event_type || "payment",
      amount,
      currency: body.currency || "EUR",
      context,
      status: decision.status,
      authorized: decision.authorized,
      hold_pending: decision.hold_pending,
      reason: decision.reason,
      created_at: now
    };

    const hash = truthHash(basePayload);

    const executionRecord = {
      execution_id,
      status: decision.status,
      result_status: decision.status,
      decision: decision.status,
      authorized: decision.authorized,
      hold_pending: decision.hold_pending,
      budget: amount,
      reason: decision.reason,
      organization_id: basePayload.organization_id,
      session_id: basePayload.session_id,
      project_id: basePayload.project_id,
      event_type: basePayload.event_type,
      source: context.source || "execute_api",
      truth_hash: hash,
      payload: {
        amount,
        currency: basePayload.currency,
        context,
        truth_hash: hash
      },
      created_at: now,
      updated_at: now
    };

    console.log("EXECUTE INSERT PAYLOAD:", executionRecord);

    const { data, error } = await supabase
      .from("executions")
      .insert([executionRecord])
      .select("*");

    if (error) {
      console.error("EXECUTE INSERT ERROR:", error);

      return res.status(500).json({
        ok: false,
        error: "EXECUTION_INSERT_FAILED",
        detail: error.message,
        hint: error.hint,
        code: error.code
      });
    }

    const inserted = Array.isArray(data) ? data[0] : data;

    const auditPayload = {
      organization_id: basePayload.organization_id,
      actor_type: "system",
      actor_id: "execute_api",
      actor_label: "EXECUTIA Engine",
      action: "EXECUTION_CREATED",
      entity: "execution",
      entity_id: execution_id,
      status: "ok",
      request_id: basePayload.session_id,
      payload: {
        execution_id,
        decision: decision.status,
        reason: decision.reason,
        truth_hash: hash
      },
      created_at: now
    };

    const { error: auditError } = await supabase
      .from("audit_logs")
      .insert([auditPayload]);

    if (auditError) {
      console.error("EXECUTE AUDIT ERROR:", auditError);
    }

    return res.status(200).json({
      ok: true,
      execution_id,
      decision: decision.status,
      status: decision.status,
      result_status: decision.status,
      authorized: decision.authorized,
      hold_pending: decision.hold_pending,
      reason: decision.reason,
      truth_hash: hash,
      execution: inserted || executionRecord,
      audit_ok: !auditError,
      audit_error: auditError?.message || null
    });

  } catch (err) {
    console.error("EXECUTE SERVER ERROR:", err);

    return res.status(500).json({
      ok: false,
      error: "EXECUTE_SERVER_ERROR",
      detail: err.message || String(err)
    });
  }
}
