function setJsonHeaders(res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
}

function requireAuth(req) {
  const auth = req.headers.authorization || "";
  const token = auth.replace("Bearer ", "");

  if (!process.env.ENGINE_REQUEST_TOKEN) {
    throw new Error("ENGINE_REQUEST_TOKEN_MISSING");
  }

  if (token !== process.env.ENGINE_REQUEST_TOKEN) {
    throw new Error("UNAUTHORIZED");
  }
}

function evaluateCondition(payload, condition) {
  const { field, operator, value } = condition;
  const fieldValue = String(payload[field] || "");

  switch (operator) {
    case "required":
      return fieldValue.trim().length > 0;

    case "min_length":
      return fieldValue.length >= Number(value);

    default:
      return true;
  }
}

function resolveDecision(results) {
  // priority: BLOCK > ESCALATE > APPROVED
  if (results.some(r => r.effect === "BLOCK")) {
    return { decision: "BLOCKED", reason: results.find(r => r.effect === "BLOCK").rule_key };
  }

  if (results.some(r => r.effect === "ESCALATE")) {
    return { decision: "ESCALATE", reason: results.find(r => r.effect === "ESCALATE").rule_key };
  }

  return { decision: "APPROVED", reason: "ALL_RULES_PASSED" };
}

async function loadRules(db) {
  const { data, error } = await db
    .from("execution_rules")
    .select("rule_key, effect, condition_json")
    .eq("event_type", "control_request")
    .eq("active", true)
    .order("rule_key");

  if (error) {
    console.error("RULE_FETCH_FAILED:", error);
    throw new Error("RULE_FETCH_FAILED");
  }

  return data || [];
}

async function insertExecution(db, record) {
  const { data, error } = await db
    .from("execution_requests")
    .insert(record)
    .select()
    .single();

  if (error) {
    console.error("DB insert failed:", error);
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

    const payload = req.body || {};

    const db = getSupabaseAdmin(); // jau eksistē tavā projektā

    // 🔥 LOAD RULES FROM DB
    const rules = await loadRules(db);

    const failedRules = [];

    for (const rule of rules) {
      let condition = {};

      try {
        condition = typeof rule.condition_json === "string"
          ? JSON.parse(rule.condition_json)
          : rule.condition_json;
      } catch {
        continue;
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
      decision: decisionResult.decision,
      decision_reason: decisionResult.reason,
      created_at: new Date().toISOString()
    };

    const inserted = await insertExecution(db, record);

    return res.status(200).json({
      ok: true,
      decision: decisionResult.decision,
      reason: decisionResult.reason,
      id: inserted.id
    });

  } catch (error) {
    console.error("CONTROL_REQUEST_FAILED:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "CONTROL_REQUEST_FAILED"
    });
  }
}
