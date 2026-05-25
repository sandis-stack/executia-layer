import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import crypto from "crypto";
import { writeAuditEvent } from "../../../services/audit.js";
import { canonicalExecutionId } from "../../../services/execution.js";
import { runExecutionCommitFlow } from "../../../services/execution-commit-flow.js";
import {
  ExecutionTransitionError,
  surfaceForAction
} from "../../../services/execution-state-transition.js";
import { OperatorDecisionError } from "../../../services/execution.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JWT_SECRET = process.env.JWT_SECRET || process.env.EXECUTIA_JWT_SECRET;
const EXECUTIA_API_KEY = process.env.EXECUTIA_API_KEY || process.env.EXECUTIA_INTERNAL_KEY;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
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

  const role =
    payload.user_metadata?.role ||
    payload.role ||
    payload.user?.role ||
    payload.operator?.role ||
    payload.authority?.role;

  const email =
    payload.email ||
    payload.user?.email ||
    payload.operator?.email ||
    payload.authority?.email;

  if (!["OPERATOR", "ADMIN", "authenticated"].includes(role)) return null;

  return {
    id: payload.id || payload.sub || payload.user?.id || payload.operator?.id || null,
    email,
    role
  };
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return json(res, 405, { ok: false, error: { code: "METHOD_NOT_ALLOWED", message: "POST required." } });
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
          const role =
            payload.user_metadata?.role ||
            payload.role ||
            payload.user?.role ||
            payload.operator?.role ||
            payload.authority?.role ||
            "OPERATOR";
          const email =
            payload.email || payload.user?.email || payload.operator?.email || payload.authority?.email || "operator@executia.io";

          if (["OPERATOR", "ADMIN", "authenticated"].includes(role)) {
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

    if (!execution_id || execution_id === "PASTE_EXECUTION_ID_HERE") {
      return json(res, 400, { ok: false, error: { code: "EXECUTION_ID_REQUIRED", message: "Real execution_id required." } });
    }

    if (!body.action) {
      return json(res, 400, { ok: false, error: { code: "INVALID_ACTION", message: "Invalid operator action." } });
    }

    const supabase =
      SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
        ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { realtime: { transport: ws } })
        : null;

    const result = await runExecutionCommitFlow({
      execution_id,
      action: body.action,
      reason: body.reason || `Operator ${String(body.action).toLowerCase()} action.`,
      operator,
      organization_id: body.organization_id || null,
      supabase
    });

    const rpcExecutionId = canonicalExecutionId(result.execution);
    const now = new Date().toISOString();

    let auditEvent = null;
    try {
      const auditResult = await writeAuditEvent({
        execution_id: rpcExecutionId,
        event_type: "OPERATOR_ACTION",
        action: result.action,
        previous_state: result.previous_state,
        next_state: result.next_state,
        actor: operator.email,
        actor_email: operator.email,
        actor_role: operator.role,
        reason: body.reason || null,
        trace: result.transition?.trace || [],
        metadata: {
          source: "operator_console",
          surface: surfaceForAction(result.action),
          semantics: result.semantics,
          commit_flow: result.commit_flow?.stages || [],
          materialized: true
        }
      });
      auditEvent = auditResult.auditEvent;
    } catch (auditError) {
      return json(res, 500, { ok: false, error: { code: "AUDIT_EVENT_FAILED", message: auditError.message } });
    }

    return json(res, 200, {
      ok: true,
      materialized: true,
      execution_id: rpcExecutionId,
      action: result.action,
      previous_state: result.previous_state,
      next_state: result.next_state,
      state: result.next_state,
      verification_phase: result.verification_phase,
      semantics: result.semantics,
      transition: result.transition,
      commit_flow: result.commit_flow,
      replay: result.replay,
      audit_event_id: auditEvent?.id,
      trace: result.transition?.trace,
      surface: surfaceForAction(result.action),
      at: now
    });
  } catch (err) {
    if (err instanceof ExecutionTransitionError || err instanceof OperatorDecisionError) {
      return json(res, err.status, {
        ok: false,
        error: { code: err.code, message: err.message }
      });
    }

    return json(res, 500, {
      ok: false,
      error: { code: "OPERATOR_ACTION_FAILED", message: err.message }
    });
  }
}
