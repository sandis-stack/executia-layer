import { createClient } from "@supabase/supabase-js";

function json(res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
}

function getSupabaseAdmin() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_ENV_MISSING");
  }

  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

function clean(value) {
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

function normalizeEffect(effect) {
  const e = clean(effect).toUpperCase();

  if (e === "BLOCK" || e === "BLOCKED") return "BLOCK";
  if (e === "ESCALATE" || e === "REVIEW") return "ESCALATE";
  if (e === "ALLOW" || e === "APPROVED") return "ALLOW";

  return "ALLOW";
}

function parseCondition(conditionJson) {
  if (!conditionJson) return {};

  if (typeof conditionJson === "string") {
    try {
      return JSON.parse(conditionJson);
    } catch {
      return {};
    }
  }

  return conditionJson;
}

function evaluateCondition(payload, condition) {
  const field = condition?.field;
  const operator = condition?.operator;
  const value = condition?.value;

  if (!field || !operator) return true;

  const fieldValue = clean(payload[field]);

  switch (operator) {
    case "required":
      return fieldValue.length > 0;

    case "min_length":
      return fieldValue.length >= Number(value || 0);

    case "equals":
      return fieldValue === String(value);

    case "not_equals":
      return fieldValue !== String(value);

    default:
      return true;
  }
}

function resolveDecision(failedRules) {
  const block = failedRules.find(r => normalizeEffect(r.effect) === "BLOCK");
  if (block) {
    return {
      decision: "BLOCKED",
      decision_reason: block.rule_key
    };
  }

  const escalate = failedRules.find(r => normalizeEffect(r.effect) === "ESCALATE");
  if (escalate) {
    return {
      decision: "ESCALATE",
      decision_reason: escalate.rule_key
    };
  }

  return {
    decision: "APPROVED",
    decision_reason: "ALL_RULES_PASSED"
  };
}

async function loadRules(db) {
  const { data, error } = await db
    .from("execution_rules")
    .select("rule_key, effect, condition_json")
    .eq("event_type", "control_request")
    .eq("active", true);

  if (error) {
    console.error("RULE_FETCH_FAILED:", error);
    throw new Error("RULE_FETCH_FAILED");
  }

  return data || [];
}

async function insertExecution(db, record) {
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
  json(res);

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
      request_id: clean(body.request_id || `REQ-${Date.now()}`),
      organization: clean(body.organization),
      operator: clean(body.operator),
      email: clean(body.email),
      sector: clean(body.sector || "Not specified"),
      context: clean(body.context),
      outcome: clean(body.outcome || "Not specified"),
      source: clean(body.source || "executia.io/request"),
      mode: clean(body.mode || "INTAKE_ONLY")
    };

    const db = getSupabaseAdmin();
    const rules = await loadRules(db);

    const failedRules = [];

    for (const rule of rules) {
      const condition = parseCondition(rule.condition_json);
      const passed = evaluateCondition(payload, condition);

      if (!passed) {
        failedRules.push(rule);
      }
    }

    const decision = resolveDecision(failedRules);

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
      decision: decision.decision,
      decision_reason: decision.decision_reason
    };

    const inserted = await insertExecution(db, record);

    return res.status(200).json({
      ok: true,
      decision: inserted.decision,
      decision_reason: inserted.decision_reason,
      failed_rules: failedRules.map(r => r.rule_key),
      request_id: inserted.request_id
    });

  } catch (error) {
    console.error("CONTROL_REQUEST_FAILED:", error);

    return res.status(
      error.message === "UNAUTHORIZED" ? 401 : 500
    ).json({
      ok: false,
      error: error.message || "CONTROL_REQUEST_FAILED"
    });
  }
}
