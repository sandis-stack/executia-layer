import { createClient } from "@supabase/supabase-js";

function json(res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, max-age=0");
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

export default async function handler(req, res) {
  json(res);

  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      error: "METHOD_NOT_ALLOWED"
    });
  }

  try {
    const limit = Math.min(Number(req.query.limit || 20), 50);
    const db = getSupabaseAdmin();

    const { data, error } = await db
      .from("execution_requests")
      .select(
        "id, request_id, organization, operator, email, sector, context, outcome, source, mode, decision, decision_reason, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("STREAM_FETCH_FAILED:", error);
      return res.status(500).json({
        ok: false,
        error: "STREAM_FETCH_FAILED",
        detail: error.message
      });
    }

    return res.status(200).json({
      ok: true,
      type: "EXECUTION_STREAM",
      mode: "SHORT_POLLING",
      count: data.length,
      records: data
    });
  } catch (error) {
    console.error("STREAM_HANDLER_FAILED:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "STREAM_HANDLER_FAILED"
    });
  }
}
