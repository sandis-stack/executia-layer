import { db } from "../../services/db.js";
import { resolveJwtContext, requireJwtPermission } from "../../services/jwt-auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Only POST is allowed."
      }
    });
  }

  try {
    const context = await resolveJwtContext(req);
    const permission = requireJwtPermission(context, "block");

    if (!permission.ok) {
      return res.status(permission.status || 401).json(permission);
    }

    const supabase = db();

    const {
      execution_id,
      reason = "Blocked by operator"
    } = req.body || {};

    if (!execution_id) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "EXECUTION_ID_REQUIRED",
          message: "execution_id is required."
        }
      });
    }

    const organization_id = context.organization_id;
    const operator = context.user;

    const { data: execution, error: fetchError } = await supabase
      .from("execution_results")
      .select("*")
      .eq("id", execution_id)
      .eq("organization_id", organization_id)
      .single();

    if (fetchError || !execution) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "EXECUTION_NOT_FOUND",
          message: "Execution not found for this organization."
        }
      });
    }

    if (execution.status !== "PENDING_REVIEW") {
      return res.status(409).json({
        ok: false,
        error: {
          code: "INVALID_EXECUTION_STATUS",
          message: `Execution cannot be blocked from status ${execution.status}.`
        }
      });
    }

    const { data: updated, error: updateError } = await supabase
      .from("execution_results")
      .update({
        status: "BLOCKED",
        operator_decision: "BLOCKED",
        operator_reason: reason,
        operator_user_id: operator.id,
        operator_email: operator.email,
        operator_role: operator.role,
        reviewed_at: new Date().toISOString()
      })
      .eq("id", execution_id)
      .eq("organization_id", organization_id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({
        ok: false,
        error: {
          code: "OPERATOR_BLOCK_FAILED",
          message: updateError.message
        }
      });
    }

    await supabase.from("audit_events").insert({
      execution_id,
      organization_id,
      event_type: "OPERATOR_BLOCKED",
      actor_user_id: operator.id,
      actor_email: operator.email,
      actor_role: operator.role,
      details: {
        reason,
        previous_status: execution.status,
        new_status: "BLOCKED"
      }
    });

    return res.status(200).json({
      ok: true,
      mode: "ENTERPRISE",
      organization_id,
      operator,
      decision: "BLOCKED",
      execution: updated
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error.message
      }
    });
  }
}
