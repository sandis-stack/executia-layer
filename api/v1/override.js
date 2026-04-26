import { createClient } from "@supabase/supabase-js";

const ALLOWED_ACTIONS = {
  APPROVE: "APPROVED",
  BLOCK: "BLOCKED",
  REVIEW: "REQUIRES_REVIEW",
};

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "METHOD_NOT_ALLOWED",
    });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        ok: false,
        error: "SUPABASE_ENV_MISSING",
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      execution_id,
      action,
      operator = "system_operator",
      reason = "Manual control action",
    } = req.body || {};

    if (!execution_id) {
      return res.status(400).json({
        ok: false,
        error: "EXECUTION_ID_REQUIRED",
      });
    }

    const normalizedAction = String(action || "").trim().toUpperCase();

    if (!ALLOWED_ACTIONS[normalizedAction]) {
      return res.status(400).json({
        ok: false,
        error: "INVALID_ACTION",
        allowed: Object.keys(ALLOWED_ACTIONS),
      });
    }

    const newStatus = ALLOWED_ACTIONS[normalizedAction];

    const { data: existing, error: fetchError } = await supabase
      .from("executions")
      .select("execution_id,status,result_status")
      .eq("execution_id", execution_id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({
        ok: false,
        error: "EXECUTION_NOT_FOUND",
        detail: fetchError?.message || null,
      });
    }

    const previousStatus = existing.status || existing.result_status || null;

    const { data: updated, error: updateError } = await supabase
      .from("executions")
      .update({
        status: newStatus,
        result_status: newStatus,
        authorized: newStatus === "APPROVED",
        hold_pending: newStatus === "REQUIRES_REVIEW",
        reason,
      })
      .eq("execution_id", execution_id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({
        ok: false,
        error: "EXECUTION_UPDATE_FAILED",
        detail: updateError.message,
      });
    }

    const { data: audit, error: auditError } = await supabase
      .from("audit_logs")
      .insert({
        execution_id,
        action: `OVERRIDE_${normalizedAction}`,
        operator,
        reason,
        previous_status: previousStatus,
        new_status: newStatus,
      })
      .select()
      .single();

    if (auditError) {
      return res.status(500).json({
        ok: false,
        error: "AUDIT_LOG_FAILED",
        detail: auditError.message,
        execution: updated,
      });
    }

    return res.status(200).json({
      ok: true,
      execution_id,
      action: `OVERRIDE_${normalizedAction}`,
      previous_status: previousStatus,
      new_status: newStatus,
      execution: updated,
      audit,
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: "INTERNAL_ERROR",
      detail: err.message || String(err),
    });
  }
}
