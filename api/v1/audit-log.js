import { createClient } from "@supabase/supabase-js";

function json(res, status, payload) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  return res.status(status).json(payload);
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return json(res, 405, {
      ok: false,
      error: "METHOD_NOT_ALLOWED"
    });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return json(res, 500, {
      ok: false,
      error: "SUPABASE_ENV_MISSING"
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });

  try {
    const execution_id = String(req.query.execution_id || "").trim();
    const limit = Math.min(parseInt(req.query.limit || "25"), 100);

    let query = supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    // ⚡ svarīgi — pareizais filtrs
    if (execution_id) {
      query = query.eq("entity_id", execution_id);
    }

    const { data, error } = await query;

    if (error) {
      return json(res, 500, {
        ok: false,
        error: "AUDIT_FETCH_FAILED",
        detail: error.message
      });
    }

    return json(res, 200, {
      ok: true,
      count: data?.length || 0,
      audit_logs: data || []
    });

  } catch (err) {
    return json(res, 500, {
      ok: false,
      error: "INTERNAL_ERROR",
      detail: err.message
    });
  }
}
