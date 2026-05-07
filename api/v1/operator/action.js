import { createClient } from "@supabase/supabase-js";
import { verifyJwt } from "../../../services/jwt-auth.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function mapAction(action) {
  const a = String(action || "").toUpperCase();

  if (a === "APPROVE") {
    return {
      action: "APPROVE",
      next_state: "APPROVED",
      trace: [
        "OPERATOR_APPROVED",
        "POLICY_STATE_CHANGED",
        "LEDGER_COMMITTED",
        "AUDIT_RECORDED"
      ]
    };
  }

  if (a === "REJECT") {
    return {
      action: "REJECT",
      next_state: "BLOCKED",
      trace: [
        "OPERATOR_REJECTED",
        "POLICY_STATE_CHANGED",
        "LEDGER_COMMITTED",
        "AUDIT_RECORDED"
      ]
    };
  }

  if (a === "FREEZE") {
    return {
      action: "FREEZE",
      next_state: "PENDING_REVIEW",
      trace: [
        "OPERATOR_FREEZE",
        "POLICY_STATE_CHANGED",
        "EXECUTION_FROZEN",
        "AUDIT_RECORDED"
      ]
    };
  }

  if (a === "ESCALATE") {
    return {
      action: "ESCALATE",
      next_state: "PENDING_REVIEW",
      trace: [
        "OPERATOR_ESCALATED",
        "POLICY_STATE_CHANGED",
        "REVIEW_REQUIRED",
        "AUDIT_RECORDED"
      ]
    };
  }

  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, {
      ok: false,
      error: { code: "METHOD_NOT_ALLOWED", message: "POST required." }
    });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(res, 500, {
      ok: false,
      error: { code: "SUPABASE_ENV_MISSING", message: "Supabase env missing." }
    });
  }

  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "").trim();

    const user = await verifyJwt(token);

    if (!user || !["OPERATOR", "ADMIN"].includes(user.role)) {
      return json(res, 401, {
        ok: false,
        error: { code: "UNAUTHORIZED", message: "Operator authority required." }
      });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const execution_id = body.execution_id;
    const requestedAction = body.action;
    const reason = body.reason || null;

    if (!execution_id) {
      return json(res, 400, {
        ok: false,
        error: { code: "EXECUTION_ID_REQUIRED", message: "execution_id required." }
      });
    }

    const transition = mapAction(requestedAction);

    if (!transition) {
      return json(res, 400, {
        ok: false,
        error: { code: "INVALID_ACTION", message: "Invalid operator action." }
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: current, error: readError } = await supabase
      .from("execution_results")
      .select("*")
      .eq("id", execution_id)
      .single();

    if (readError || !current) {
      return json(res, 404, {
        ok: false,
        error: { code: "EXECUTION_NOT_FOUND", message: "Execution not found." }
      });
    }

    const previous_state = current.status || null;

    const { error: updateError } = await supabase
      .from("execution_results")
      .update({
        status: transition.next_state,
        updated_at: new Date().toISOString()
      })
      .eq("id", execution_id);

    if (updateError) {
      return json(res, 500, {
        ok: false,
        error: { code: "STATE_UPDATE_FAILED", message: updateError.message }
      });
    }

    const trace = transition.trace.map((state) => ({
      state,
      timestamp: new Date().toISOString(),
      actor: user.email,
      role: user.role
    }));

    const { data: auditEvent, error: auditError } = await supabase
      .from("audit_events")
      .insert({
        execution_id,
        action: transition.action,
        previous_state,
        next_state: transition.next_state,
        actor_email: user.email,
        actor_role: user.role,
        reason,
        trace,
        metadata: {
          source: "operator_console",
          governance: "execution_time_truth",
          materialized: true
        }
      })
      .select()
      .single();

    if (auditError) {
      return json(res, 500, {
        ok: false,
        error: { code: "AUDIT_EVENT_FAILED", message: auditError.message }
      });
    }

    return json(res, 200, {
      ok: true,
      execution_id,
      action: transition.action,
      previous_state,
      next_state: transition.next_state,
      materialized: true,
      audit_event: auditEvent,
      trace
    });
  } catch (err) {
    return json(res, 500, {
      ok: false,
      error: { code: "OPERATOR_ACTION_FAILED", message: err.message }
    });
  }
}
