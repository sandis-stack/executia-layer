import { createClient } from "@supabase/supabase-js";

const ACTION_TO_STATUS = {
  APPROVE: "APPROVED",
  BLOCK: "BLOCKED",
  REVIEW: "REQUIRES_REVIEW"
};

function json(res, status, payload) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  return res.status(status).json(payload);
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

    const execution_id = String(body.execution_id || "").trim();
    const action = String(body.action || "").trim().toUpperCase();
    const operator = String(body.operator || "EXECUTIA_OPERATOR").trim();
    const reason = String(body.reason || "Manual control action").trim();

    if (!execution_id) {
      return json(res, 400, {
        ok: false,
        error: "EXECUTION_ID_REQUIRED"
      });
    }

    if (!ACTION_TO_STATUS[action]) {
      return json(res, 400, {
        ok: false,
        error: "INVALID_ACTION",
        allowed: Object.keys(ACTION_TO_STATUS)
      });
    }

    const new_status = ACTION_TO_STATUS[action];

    const { data: existing, error: fetchError } = await supabase
      .from("executions")
      .select("*")
      .eq("execution_id", execution_id)
      .single();

    if (fetchError || !existing) {
      return json(res, 404, {
        ok: false,
        error: "EXECUTION_NOT_FOUND",
        detail: fetchError?.message || null
      });
    }

    const previous_status =
      existing.status ||
      existing.result_status ||
      existing.ledger_decision ||
      null;

    const updatePayload = {
      status: new_status,
      result_status: new_status,
      authorized: new_status === "APPROVED",
      hold_pending: new_status === "REQUIRES_REVIEW",
      reason,
      updated_at: new Date().toISOString()
    };

    const { data: updated, error: updateError } = await supabase
      .from("executions")
      .update(updatePayload)
      .eq("execution_id", execution_id)
      .select("*")
      .single();

    if (updateError || !updated) {
      return json(res, 500, {
        ok: false,
        error: "EXECUTION_UPDATE_FAILED",
        detail: updateError?.message || null
      });
    }

    let audit_ok = true;
    let audit_error = null;
    let audit = null;

    try {
      const auditPayload = {
        organization_id:
          updated.organization_id ||
          updated.payload?.organization_id ||
          existing.organization_id ||
          existing.payload?.organization_id ||
          "org_unknown",

        actor_type: "operator",
        actor_id: operator,
        actor_label: operator,

        action: "EXECUTION_OVERRIDE",
        entity: "execution",
        entity_id: execution_id,

        status: "ok",
        request_id:
          updated.request_id ||
          updated.payload?.request_id ||
          updated.payload?.session_id ||
          updated.session_id ||
          null,

        payload: {
          execution_id,
          action,
          previous_status,
          new_status,
          reason,
          operator,
          source: "executia_control_interface",
          execution_before: {
            id: existing.id,
            status: existing.status,
            result_status: existing.result_status,
            authorized: existing.authorized,
            hold_pending: existing.hold_pending,
            reason: existing.reason
          },
          execution_after: {
            id: updated.id,
            status: updated.status,
            result_status: updated.result_status,
            authorized: updated.authorized,
            hold_pending: updated.hold_pending,
            reason: updated.reason
          }
        },

        created_at: new Date().toISOString()
      };

      const { data: auditData, error: auditInsertError } = await supabase
        .from("audit_logs")
        .insert(auditPayload)
        .select("*")
        .single();

      if (auditInsertError) {
        audit_ok = false;
        audit_error = auditInsertError.message;
      } else {
        audit = auditData;
      }
    } catch (err) {
      audit_ok = false;
      audit_error = err.message || String(err);
    }

    return json(res, 200, {
      ok: true,
      execution_id,
      action,
      previous_status,
      new_status,
      audit_ok,
      audit_error,
      execution: updated,
      audit
    });

  } catch (err) {
    return json(res, 500, {
      ok: false,
      error: "INTERNAL_ERROR",
      detail: err.message || String(err)
    });
  }
}
