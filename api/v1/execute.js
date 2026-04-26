import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) throw new Error("SUPABASE_ENV_MISSING");

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function makeId() {
  return "EX-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

function makeHash(payload) {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function decide(amount, context = {}) {
  if (context.legalBlock === true) {
    return { status: "BLOCKED", authorized: false, hold_pending: false, reason: "Legal block detected" };
  }

  if (!amount || Number(amount) <= 0) {
    return { status: "BLOCKED", authorized: false, hold_pending: false, reason: "Invalid execution amount" };
  }

  if (Number(amount) >= 10000) {
    return { status: "REQUIRES_REVIEW", authorized: false, hold_pending: true, reason: "High-value execution requires review" };
  }

  return { status: "APPROVED", authorized: true, hold_pending: false, reason: "Execution approved" };
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  try {
    const supabase = getSupabase();
    const body = req.body || {};

    const amount = Number(body.amount || 0);
    const context = body.context || {};
    const result = decide(amount, context);
    const now = new Date().toISOString();
    const execution_id = body.execution_id || makeId();

    const proofPayload = {
      execution_id,
      amount,
      currency: body.currency || "EUR",
      context,
      status: result.status,
      authorized: result.authorized,
      hold_pending: result.hold_pending,
      reason: result.reason,
      created_at: now
    };

    const truth_hash = makeHash(proofPayload);

    const record = {
      execution_id,
      status: result.status,
      authorized: result.authorized,
      hold_pending: result.hold_pending,
      budget: amount,
      reason: result.reason,
      payload: {
        amount,
        currency: body.currency || "EUR",
        context,
        truth_hash
      },
      truth_hash,
      created_at: now,
      updated_at: now
    };

    const { data, error } = await supabase
      .from("executions")
      .insert([record])
      .select("*");

    if (error) {
      return res.status(500).json({
        ok: false,
        error: "EXECUTION_INSERT_FAILED",
        detail: error.message,
        hint: error.hint,
        code: error.code
      });
    }

    const execution = Array.isArray(data) ? data[0] : data;

    const auditPayload = {
      organization_id: "org_norsteel",
      actor_type: "system",
      actor_id: "execute_api",
      actor_label: "EXECUTIA Engine",
      action: "EXECUTION_CREATED",
      entity: "execution",
      entity_id: execution_id,
      status: "ok",
      payload: {
        execution_id,
        decision: result.status,
        reason: result.reason,
        truth_hash
      },
      created_at: now
    };

    const { error: auditError } = await supabase
      .from("audit_logs")
      .insert([auditPayload]);

    if (auditError) {
      console.error("EXECUTE_AUDIT_FAILED:", auditError);
    }

    return res.status(200).json({
      ok: true,
      execution_id,
      status: result.status,
      decision: result.status,
      authorized: result.authorized,
      hold_pending: result.hold_pending,
      reason: result.reason,
      truth_hash,
      execution,
      audit_ok: !auditError,
      audit_error: auditError?.message || null
    });

  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: "EXECUTE_SERVER_ERROR",
      detail: err.message || String(err)
    });
  }
}
