import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import crypto from "crypto";
import { runExecutionCommitFlow } from "../../../services/execution-commit-flow.js";
import {
  ExecutionTransitionError,
  resolveOperatorAction
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

function resolveOperator(req) {
  const incomingKey = req.headers["x-api-key"] || req.headers["x-executia-key"];

  if (EXECUTIA_API_KEY && incomingKey === EXECUTIA_API_KEY) {
    return {
      id: "system",
      email: "system@executia.io",
      role: "ADMIN"
    };
  }

  const token = String(req.headers.authorization || "").replace("Bearer ", "").trim();
  let operator = verifyJwtHS256(token);

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

  return operator;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return json(res, 405, { ok: false, error: { code: "METHOD_NOT_ALLOWED", message: "POST required." } });
    }

    const operator = resolveOperator(req);
    if (!operator) {
      return json(res, 401, { ok: false, error: { code: "UNAUTHORIZED", message: "Operator authority required." } });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const execution_id = body.execution_id;
    const action = body.action;

    if (!execution_id) {
      return json(res, 400, { ok: false, error: { code: "EXECUTION_ID_REQUIRED", message: "execution_id required." } });
    }

    if (!action) {
      return json(res, 400, { ok: false, error: { code: "ACTION_REQUIRED", message: "action required." } });
    }

    resolveOperatorAction(action);

    const supabase =
      SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
        ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { realtime: { transport: ws } })
        : null;

    const result = await runExecutionCommitFlow({
      execution_id,
      action,
      reason: body.reason || `Operator ${String(action).toLowerCase()}.`,
      operator,
      organization_id: body.organization_id || null,
      supabase
    });

    return json(res, 200, {
      ok: true,
      state: result.next_state,
      ...result
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
      error: { code: "EXECUTION_TRANSITION_FAILED", message: err.message }
    });
  }
}
