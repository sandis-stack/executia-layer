import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      error: "METHOD_NOT_ALLOWED"
    });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        ok: false,
        error: "SUPABASE_ENV_MISSING"
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const executionId = req.query?.execution_id || null;
    const limitRaw = req.query?.limit || 25;
    const limit = Math.min(Number(limitRaw) || 25, 100);

    let query = supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (executionId) {
      query = query.eq("execution_id", executionId);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({
        ok: false,
        error: "AUDIT_QUERY_FAILED",
        detail: error.message
      });
    }

    return res.status(200).json({
      ok: true,
      count: data?.length || 0,
      audit_logs: data || []
    });

  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: "INTERNAL_ERROR",
      detail: err.message || String(err)
    });
  }
}
