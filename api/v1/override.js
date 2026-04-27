import { createClient } from "@supabase/supabase-js";

function json(res, status, payload) {
  res.setHeader("Content-Type", "application/json");
  return res.status(status).json(payload);
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeAction(action) {
  const value = String(action || "").trim().toUpperCase();

  if (value === "APPROVE" || value === "APPROVED") return "APPROVED";
  if (value === "BLOCK" || value === "BLOCKED") return "BLOCKED";
  if (value === "REVIEW" || value === "REQUIRES_REVIEW") return "REQUIRES_REVIEW";

  return null;
}

function getCurrentStatus(row) {
  return row?.status || row?.result_status || row?.decision || "UNKNOWN";
}

function buildReason(newStatus, providedReason) {
  if (providedReason) return providedReason;

  if (newStatus === "APPROVED") {
    return "Manual force approve from EXECUTIA Control Interface";
  }

  if (newStatus === "BLOCKED") {
    return "Manual block from EXECUTIA Control Interface";
  }

  if (newStatus === "REQUIRES_REVIEW") {
    return "Manual review request from EXECUTIA Control Interface";
  }

  return "Manual control action";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, {
      ok: false,
      error: "METHOD_NOT_ALLOWED"
    });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return json(res, 500, {
      ok: false,
      error: "SUPABASE_ENV_MISSING"
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  try {
    const body = req.body || {};

    const executionId = body.execution_id || body.id || body.request_id;
    const newStatus = normalizeAction(body.action || body.status);
    const operator = body.operator || "EXECUTIA Control Interface";
    const reason = buildReason(newStatus, body.reason);

    if (!executionId) {
      return json(res, 400, {
        ok: false,
        error: "EXECUTION_ID_REQUIRED"
      });
    }

    if (!newStatus) {
      return json(res, 400, {
        ok: false,
        error: "INVALID_ACTION",
        allowed: ["APPROVE", "BLOCK", "REVIEW"]
      });
    }

    const { data: existing, error: readError } = await supabase
      .from("executions")
      .select("*")
      .eq("execution_id", executionId)
      .maybeSingle();

    if (readError) {
      return json(res, 500, {
        ok: false,
        error: "EXECUTION_READ_FAILED",
        detail: readError.message
      });
    }

    if (!existing) {
      return json(res, 404, {
        ok: false,
        error: "EXECUTION_NOT_FOUND",
        execution_id: executionId
      });
    }

    const previousStatus = getCurrentStatus(existing);

    const updatedPayload = {
      ...(existing.payload || {}),
      override: {
        enabled: true,
        operator,
        previous_status: previousStatus,
        new_status: newStatus,
        reason,
        created_at: nowIso()
      }
    };

    const updatePatch = {
      status: newStatus,
      result_status: newStatus,
      reason,
      authorized: newStatus === "APPROVED",
      hold_pending: newStatus === "REQUIRES_REVIEW",
      payload: updatedPayload,
      updated_at: nowIso()
    };

    const { data: updated, error: updateError } = await supabase
      .from("executions")
      .update(updatePatch)
      .eq("execution_id", executionId)
      .select("*")
      .single();

    if (updateError) {
      return json(res, 500, {
        ok: false,
        error: "EXECUTION_UPDATE_FAILED",
        detail: updateError.message
      });
    }

    let auditOk = true;
    let auditError = null;

    const auditRecord = {
      organization_id: updated.organization_id || existing.organization_id || "org_norsteel",
      actor_type: "operator",
      actor_id: operator,
      actor_label: operator,
      action: "EXECUTION_OVERRIDE",
      entity: "execution",
      entity_id: executionId,
      request_id: updated.request_id || existing.request_id || null,
      status: "ok",
      previous_status: previousStatus,
      new_status: newStatus,
      reason,
      payload: {
        execution_id: executionId,
        previous_status: previousStatus,
        new_status: newStatus,
        operator,
        reason,
        source: "control_interface"
      },
      created_at: nowIso()
    };

    const { error: auditInsertError } = await supabase
      .from("audit_logs")
      .insert(auditRecord);

    if (auditInsertError) {
      auditOk = false;
      auditError = auditInsertError.message;
    }

    return json(res, 200, {
      ok: true,
      action: "EXECUTION_OVERRIDE",
      execution_id: executionId,
      previous_status: previousStatus,
      new_status: newStatus,
      reason,
      operator,
      audit_ok: auditOk,
      audit_error: auditError,
      execution: updated
    });

  } catch (err) {
    return json(res, 500, {
      ok: false,
      error: "OVERRIDE_SERVER_ERROR",
      detail: err.message || String(err)
    });
  }
}
