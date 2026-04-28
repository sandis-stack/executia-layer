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

function evaluateExecution(payload) {
  const { organization, context, outcome } = payload;

  // 🔴 BASIC RULES (tu vari paplašināt vēlāk)
  if (!organization || !context) {
    return { decision: "BLOCKED", reason: "MISSING_CORE_FIELDS" };
  }

  if (context.length < 5) {
    return { decision: "ESCALATE", reason: "LOW_CONTEXT_SIGNAL" };
  }

  // 🟢 DEFAULT
  return { decision: "APPROVED", reason: "BASIC_VALIDATION_OK" };
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

    const decisionResult = evaluateExecution(payload);

    const db = getSupabaseAdmin(); // ⚠️ tev jau ir šī funkcija

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
