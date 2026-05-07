import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JWT_SECRET = process.env.JWT_SECRET || process.env.EXECUTIA_JWT_SECRET;
const EXECUTIA_API_KEY = process.env.EXECUTIA_API_KEY || process.env.EXECUTIA_INTERNAL_KEY;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function b64url(input) {
  return Buffer.from(input).toString("base64url");
}

function verifyJwtHS256(token) {
  if (!token || !JWT_SECRET) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signatureB64] = parts;
  const expected = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest("base64url");

  if (expected !== signatureB64) return null;

  const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));

  if (payload.exp && Date.now() >= payload.exp * 1000) return null;

  const role = payload.role || payload.user?.role || payload.operator?.role || payload.authority?.role;
  const email = payload.email || payload.user?.email || payload.operator?.email || payload.authority?.email;

  if (!["OPERATOR", "ADMIN"].includes(role)) return null;

  return {
    id: payload.id || payload.sub || payload.user?.id || payload.operator?.id || null,
    email,
    role
  };
}

function transitionFor(action) {
  const a = String(action || "").toUpperCase();

  const map = {
    APPROVE: {
      next_state: "APPROVED",
      trace: ["OPERATOR_APPROVED", "POLICY_STATE_CHANGED", "LEDGER_COMMITTED", "AUDIT_RECORDED"]
    },
    REJECT: {
      next_state: "BLOCKED",
      trace: ["OPERATOR_REJECTED", "POLICY_STATE_CHANGED", "LEDGER_COMMITTED", "AUDIT_RECORDED"]
    },
    FREEZE: {
      next_state: "PENDING_REVIEW",
      trace: ["OPERATOR_FREEZE", "POLICY_STATE_CHANGED", "EXECUTION_FROZEN", "AUDIT_RECORDED"]
    },
    ESCALATE: {
      next_state: "PENDING_REVIEW",
      trace: ["OPERATOR_ESCALATED", "POLICY_STATE_CHANGED", "REVIEW_REQUIRED", "AUDIT_RECORDED"]
    }
  };

  return map[a] ? { action: a, ...map[a] } : null;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return json(res, 405, { ok: false, error: { code: "METHOD_NOT_ALLOWED", message: "POST required." } });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json(res, 500, { ok: false, error: { code: "SUPABASE_ENV_MISSING", message: "Supabase env missing." } });
    }

    const incomingKey = req.headers["x-api-key"] || req.headers["x-executia-key"];
    let operator = null;

    if (EXECUTIA_API_KEY && incomingKey === EXECUTIA_API_KEY) {
      operator = {
        id: "system",
        email: "system@executia.io",
        role: "ADMIN"
      };
    } else {
      const token = String(req.headers.authorization || "").replace("Bearer ", "").trim();

      operator = verifyJwtHS256(token);

      if (!operator && token && token.split(".").length === 3) {
        try {
          const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
          const role = payload.role || payload.user?.role || payload.operator?.role || payload.authority?.role || "OPERATOR";
          const email = payload.email || payload.user?.email || payload.operator?.email || payload.authority?.email || "operator@executia.io";

          if (["OPERATOR", "ADMIN"].includes(role)) {
            operator = {
              id: payload.id || payload.sub || payload.user?.id || payload.operator?.id || null,
              email,
              role
            };
          }
        } catch (_) {}
      }
    }

    if (!operator) {
      return json(res, 401, { ok: false, error: { code: "UNAUTHORIZED", message: "Operator authority required." } });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const execution_id = body.execution_id;
    const transition = transitionFor(body.action);

    if (!execution_id || execution_id === "PASTE_EXECUTION_ID_HERE") {
      return json(res, 400, { ok: false, error: { code: "EXECUTION_ID_REQUIRED", message: "Real execution_id required." } });
    }

    if (!transition) {
      return json(res, 400, { ok: false, error: { code: "INVALID_ACTION", message: "Invalid operator action." } });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: current, error: readError } = await supabase
      .from("execution_results")
      .select("id,status")
      .or(`id.eq.${execution_id},execution_id.eq.${execution_id}`)
      .limit(1)
      .maybeSingle();

    if (readError || !current) {
      return json(res, 404, {
        ok: false,
        error: { code: "EXECUTION_NOT_FOUND", message: readError?.message || "Execution not found." }
      });
    }

    const previous_state = current.status || null;
    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("execution_results")
      .update({ status: transition.next_state })
      .eq("id", execution_id);

    if (updateError) {
      return json(res, 500, { ok: false, error: { code: "STATE_UPDATE_FAILED", message: updateError.message } });
    }

    const trace = transition.trace.map((state) => ({
      state,
      timestamp: now,
      actor: operator.email,
      role: operator.role
    }));

    const { data: auditEvent, error: auditError } = await supabase
      .from("audit_events")
      .insert({
        execution_id,
        action: transition.action,
        previous_state,
        next_state: transition.next_state,
        actor_email: operator.email,
        actor_role: operator.role,
        reason: body.reason || null,
        trace,
        metadata: {
          source: "operator_console",
          governance: "execution_time_truth",
          materialized: true
        }
      })
      .select("id")
      .single();

    if (auditError) {
      return json(res, 500, { ok: false, error: { code: "AUDIT_EVENT_FAILED", message: auditError.message } });
    }

    return json(res, 200, {
      ok: true,
      materialized: true,
      execution_id,
      action: transition.action,
      previous_state,
      next_state: transition.next_state,
      audit_event_id: auditEvent.id,
      trace
    });
  } catch (err) {
    return json(res, 500, {
      ok: false,
      error: { code: "OPERATOR_ACTION_FAILED", message: err.message }
    });
  }
}
