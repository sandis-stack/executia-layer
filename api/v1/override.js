import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  try {
    const { execution_id, action, operator, reason } = req.body || {};

    if (!execution_id || !action) {
      return res.status(400).json({
        ok: false,
        error: "execution_id and action required"
      });
    }

    // ===============================
    // MAP ACTION → STATUS
    // ===============================
    let new_status;

    if (action === "APPROVE") new_status = "APPROVED";
    else if (action === "BLOCK") new_status = "BLOCKED";
    else if (action === "REVIEW") new_status = "REQUIRES_REVIEW";
    else {
      return res.status(400).json({
        ok: false,
        error: "INVALID_ACTION"
      });
    }

    // ===============================
    // GET CURRENT EXECUTION
    // ===============================
    const { data: existing, error: fetchError } = await supabase
      .from("executions")
      .select("*")
      .eq("execution_id", execution_id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({
        ok: false,
        error: "EXECUTION_NOT_FOUND"
      });
    }

    const previous_status =
      existing.status ||
      existing.result_status ||
      existing.decision ||
      "UNKNOWN";

    // ===============================
    // UPDATE EXECUTION
    // ===============================
    const { data: updatedExecution, error: updateError } = await supabase
      .from("executions")
      .update({
        status: new_status,
        result_status: new_status,
        decision: new_status,
        updated_at: new Date().toISOString(),
        operator: operator || "system",
        reason: reason || "Manual override"
      })
      .eq("execution_id", execution_id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({
        ok: false,
        error: "UPDATE_FAILED",
        detail: updateError.message
      });
    }

    // ===============================
    // INSERT AUDIT LOG
    // ===============================
    const { error: auditError } = await supabase
      .from("audit_logs")
      .insert([
        {
          execution_id,
          action,
          previous_status,
          new_status,
          operator: operator || "system",
          reason: reason || "Manual override",
          created_at: new Date().toISOString()
        }
      ]);

    // ===============================
    // RESPONSE
    // ===============================
    return res.status(200).json({
      ok: true,
      action,
      execution_id,
      previous_status,
      new_status,
      execution: updatedExecution,
      audit_ok: !auditError
    });

  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: "SERVER_ERROR",
      detail: err.message
    });
  }
}
