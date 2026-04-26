import { createClient } from "@supabase/supabase-js";

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

function mapActionToStatus(action) {
  if (action === "APPROVE") return "APPROVED";
  if (action === "BLOCK") return "BLOCKED";
  if (action === "REVIEW") return "REQUIRES_REVIEW";
  return null;
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

    const {
      execution_id,
      action,
      operator = "Sandis",
      reason = "Manual override from EXECUTIA Control Interface"
    } = req.body || {};

    console.log("OVERRIDE INPUT:", {
      execution_id,
      action,
      operator
    });

    if (!execution_id || !action) {
      return res.status(400).json({
        ok: false,
        error: "MISSING_REQUIRED_FIELDS",
        required: ["execution_id", "action"]
      });
    }

    const new_status = mapActionToStatus(action);

    if (!new_status) {
      return res.status(400).json({
        ok: false,
        error: "INVALID_ACTION",
        allowed: ["APPROVE", "BLOCK", "REVIEW"]
      });
    }

    const { data: existing, error: fetchError } = await supabase
      .from("executions")
      .select("*")
      .eq("execution_id", execution_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log("FETCH RESULT:", {
      found: !!existing,
      fetchError: fetchError?.message || null
    });

    if (fetchError) {
      return res.status(500).json({
        ok: false,
        error: "EXECUTION_FETCH_FAILED",
        detail: fetchError.message
      });
    }

    if (!existing) {
      return res.status(404).json({
        ok: false,
        error: "EXECUTION_NOT_FOUND",
        execution_id
      });
    }

    const previous_status =
      existing.status ||
      existing.result_status ||
      existing.decision ||
      "UNKNOWN";

    const updatePayload = {
      status: new_status,
      result_status: new_status,
      decision: new_status,
      authorized: new_status === "APPROVED",
      hold_pending: new_status === "REQUIRES_REVIEW",
      operator,
      reason,
      updated_at: new Date().toISOString()
    };

    const { data: updatedExecution, error: updateError } = await supabase
      .from("executions")
      .update(updatePayload)
      .eq("execution_id", execution_id)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (updateError) {
      return res.status(500).json({
        ok: false,
        error: "EXECUTION_UPDATE_FAILED",
        detail: updateError.message
      });
    }

    const auditPayload = {
      organization_id: existing.organization_id || "org_norsteel",
      actor_type: "user",
      actor_id: operator,
      actor_label: operator,
      action: "EXECUTION_OVERRIDE",
      entity: "execution",
      entity_id: execution_id,
      status: "ok",
      request_id: existing.request_id || null,
      payload: {
        execution_id,
        action,
        previous_status,
        new_status,
        reason,
        operator
      },
      created_at: new Date().toISOString()
    };

    const { error: auditError } = await supabase
      .from("audit_logs")
      .insert(auditPayload);

    if (auditError) {
      console.error("AUDIT LOG FAILED:", auditError.message);
    }

    return res.status(200).json({
      ok: true,
      action,
      execution_id,
      previous_status,
      new_status,
      execution: updatedExecution || {
        ...existing,
        ...updatePayload
      },
      audit_ok: !auditError,
      audit_error: auditError?.message || null
    });

  } catch (err) {
    console.error("OVERRIDE SERVER ERROR:", err);

    return res.status(500).json({
      ok: false,
      error: "OVERRIDE_SERVER_ERROR",
      detail: err.message || String(err)
    });
  }
}
