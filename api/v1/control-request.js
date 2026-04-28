import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_ENV_MISSING");
  }

  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false
      }
    }
  );
}

function setJsonHeaders(res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
}

function cleanText(value) {
  return String(value || "").trim();
}

function requireAuth(req) {
  const auth = req.headers.authorization || "";
  const token = auth.replace("Bearer ", "").trim();

  if (!process.env.ENGINE_REQUEST_TOKEN) {
    throw new Error("ENGINE_REQUEST_TOKEN_MISSING");
  }

  if (!token || token !== process.env.ENGINE_REQUEST_TOKEN) {
    throw new Error("UNAUTHORIZED");
  }
}

function evaluateCondition(payload, condition) {
  const field = condition?.field;
  const operator = condition?.operator;
  const value = condition?.value;

  if (!field || !operator) return true;

  const fieldValue = String(payload[field] || "");

  switch (operator) {
    case "required":
      return fieldValue.trim().length > 0;

    case "min_length":
      return fieldValue.trim().length >= Number(value || 0);

    case "equals":
      return fieldValue === String(value);

    case "not_equals":
      return fieldValue !== String(value);

    default:
      return true;
  }
}

function normalizeEffect(effect) {
  const e = String(effect || "").toUpperCase();

  if (e === "BLOCK" || e === "BLOCKED") return "BLOCK";
  if (e === "ESCALATE" || e === "REVIEW" || e === "REQUIRES_REVIEW") return "ESCALATE";
  if (e === "ALLOW" || e === "APPROVE" || e === "APPROVED") return "ALLOW";

  return "ALLOW";
}

function resolveDecision(failedRules) {
  const normalized = failedRules.map((rule) => ({
    ...rule,
    effect: normalizeEffect(rule.effect)
  }));

  const blockRule = normalized.find((rule) => rule.effect === "BLOCK");
  if (blockRule) {
    return {
      decision: "BLOCKED",
      reason: blockRule.rule_key || "BLOCK_RULE_MATCHED"
    };
  }

  const escalateRule = normalized.find((rule) => rule.effect === "ESCALATE");
  if (escalateRule) {
    return {
      decision: "ESCALATE",
      reason: escalateRule.rule_key || "ESCALATE_RULE_MATCHED"
    };
  }

  return {
    decision: "APPROVED",
    reason: "ALL_RULES_PASSED"
  };
}

async function loadRules(db) {
  const { data, error } = await db
    .from("execution_rules")
    .select("rule_key, effect, condition_json, event_type, active")
    .eq("event_type", "control_request")
    .eq("active", true)
    .order("rule_key", { ascending: true });

  if (error) {
    console.error("RULE_FETCH_FAILED:", error);
    throw new Error("RULE_FETCH_FAILED");
  }

  return data || [];
}

async function insertExecutionRequest(db, record) {
  const { data, error } = await db
    .from("execution_requests")
    .insert([record])
    .select()
    .single();

  if (error) {
    console.error("DB_INSERT_FAILED:", error);
    throw new Error("DB_INSERT_FAILED");
  }

  return data;
}

export default async function handler(req, res) {
  setJsonHeaders(res);

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "METHOD_NOT_ALLOWED"
    });
  }

  try {
    requireAuth(req);

    const body = req.body || {};

    const payload = {
      request_id: cleanText(body.request_id || `REQ-${Date.now()}`),
      organization: cleanText(body.organization),
      operator: cleanText(body.operator),
      email: cleanText(body.email),
      sector: cleanText(body.sector || "Not specified"),
      context: cleanText(body.context),
      outcome: cleanText(body.outcome || "Not specified"),
      source: cleanText(body.source || "manual"),
      mode: cleanText(body.mode || "INTAKE_ONLY")
    };

    const db = getSupabaseAdmin();
    const rules = await loadRules(db);

    const failedRules = [];

    for (const rule of rules) {
      let condition = rule.condition_json || {};

      if (typeof condition === "string") {
        try {
          condition = JSON.parse(condition);
        } catch {
          console.error("INVALID_RULE_JSON:", rule.rule_key);
          continue;
        }
      }

      const passed = evaluateCondition(payload, condition);

      if (!passed) {
        failedRules.push(rule);
      }
    }

    const decisionResult = resolveDecision(failedRules);

    const record = {
      request_id: payload.request_id,
      organization: payload.organization,
      operator: payload.operator,
      email: payload.email,
      sector: payload.sector,
      context: payload.context,
      outcome: payload.outcome,
      source: payload.source,
      mode: payload.mode,
      decision: decisionResult.decision,
      decision_reason: decisionResult.reason
    };

    const inserted = await insertExecutionRequest(db, record);

    return res.status(200).json({
      ok: true,
      status: "RECEIVED",
      mode: "INTAKE_ONLY",
      request_id: inserted.request_id,
      decision: inserted.decision,
      decision_reason: inserted.decision_reason,
      failed_rules: failedRules.map((rule) => rule.rule_key),
      record_id: inserted.id
    });
  } catch (error) {
    console.error("CONTROL_REQUEST_FAILED:", error);

    const status =
      error.message === "UNAUTHORIZED" ? 401 :
      error.message === "ENGINE_REQUEST_TOKEN_MISSING" ? 500 :
      500;

    return res.status(status).json({
      ok: false,
      error: error.message || "CONTROL_REQUEST_FAILED"
    });
  }
}
