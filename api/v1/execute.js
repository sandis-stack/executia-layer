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

function makeTruthHash(payload) {
  const stable = JSON.stringify(payload, Object.keys(payload).sort());
  return crypto.createHash("sha256").update(stable).digest("hex");
}

function decide({ amount, context }) {
  if (context?.legalBlock === true) {
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

  if (Number(amount) > 10000) {
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
    reason: "Execution approved by deterministic rules"
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

    const organization_id = body.organization_id || "org_norsteel";
    const session_id = body.session_id || "session_" + Date.now();
    const project_id = body.project_id || "default_project";
    const event_type = body.event_type || "payment";
    const amount = Number(body.amount || 0);
    const currency = body.currency || "EUR";
    const context = body.context || {};

    const execution_id =
      body.execution_id ||
      "EX-" + Date.now() + "-" + Math.random().toString(16).slice(2, 8);

    const decisionResult = decide({ amount, context });

    const created_at = new Date().toISOString();

    const truthPayload = {
      execution_id,
      organization_id,
      session_id,
      project_id,
      event_type,
      amount,
      currency,
      context,
      status: decisionResult.status,
      authorized: decisionResult.authorized,
      hold_pending: decisionResult.hold_pending,
      reason: decisionResult.reason,
      created_at
    };

    const truth_hash = makeTruthHash(truthPayload);

    const executionRecord = {
      execution_id,
      organization_id,
      session_id,
      project_id,
      event_type,

      amount,
      currency,

      status: decisionResult.status,
      result_status: decisionResult.status,
      decision: decisionResult.status,

      authorized: decisionResult.authorized,
      hold_pending: decisionResult.hold_pending,

      reason: decisionResult.reason,
      source: context.source || "execute_api",

      payload: {
        ...truthPayload,
        truth_hash
      },

      truth_hash,
      created_at,
      updated_at: created_at
    };

    const { data: inserted, error: insertError } = await supabase
      .from("executions")
      .insert(executionRecord)
      .select("*")
      .maybeSingle();

    if (insertError) {
      return res.status(500).json({
        ok: false,
        error: "EXECUTION_INSERT_FAILED",
        detail: insertError.message
      });
    }

    const auditPayload = {
      organization_id,
      actor_type: "system",
      actor_id: "execute_api",
      actor_label: "EXECUTIA Engine",
      action: "EXECUTION_CREATED",
      entity: "execution",
      entity_id: execution_id,
      status: "ok",
      request_id: session_id,
      payload: {
        execution_id,
        status: decisionResult.status,
        reason: decisionResult.reason,
        truth_hash
      },
      created_at
    };

    const { error: auditError } = await supabase
      .from("audit_logs")
      .insert(auditPayload);

    if (auditError) {
      console.error("EXECUTE AUDIT FAILED:", auditError.message);
    }

    return res.status(200).json({
      ok: true,
      execution_id,
      status: decisionResult.status,
      result_status: decisionResult.status,
      decision: decisionResult.status,
      authorized: decisionResult.authorized,
      hold_pending: decisionResult.hold_pending,
      reason: decisionResult.reason,
      truth_hash,
      execution: inserted,
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
