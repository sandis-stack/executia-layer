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

function cleanText(value) {
  return String(value || "").trim();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "METHOD_NOT_ALLOWED"
    });
  }

  const auth = req.headers.authorization || "";
  const token = auth.replace("Bearer ", "").trim();

  if (!process.env.ENGINE_REQUEST_TOKEN || token !== process.env.ENGINE_REQUEST_TOKEN) {
    return res.status(401).json({
      ok: false,
      error: "UNAUTHORIZED"
    });
  }

  try {
    const body = req.body || {};

    const request = {
      request_id: cleanText(body.request_id),
      organization: cleanText(body.organization),
      operator: cleanText(body.operator),
      email: cleanText(body.email),
      sector: cleanText(body.sector || "Not specified"),
      context: cleanText(body.context),
      outcome: cleanText(body.outcome || "Not specified"),
      source: cleanText(body.source || "executia.io/request"),
      mode: "INTAKE_ONLY"
    };

    if (!request.request_id || !request.organization || !request.operator || !request.email || !request.context) {
      return res.status(400).json({
        ok: false,
        error: "MISSING_REQUIRED_FIELDS"
      });
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("execution_requests")
      .insert([request])
      .select()
      .single();

    if (error) {
      console.error("DB insert failed:", error);
      return res.status(500).json({
        ok: false,
        error: "DB_INSERT_FAILED",
        detail: error.message
      });
    }

    return res.status(200).json({
      ok: true,
      status: "RECEIVED",
      mode: "INTAKE_ONLY",
      request_id: request.request_id,
      record: data
    });
  } catch (error) {
    console.error("CONTROL_REQUEST_FAILED:", error);

    return res.status(500).json({
      ok: false,
      error: "CONTROL_REQUEST_FAILED",
      message: error.message
    });
  }
}
