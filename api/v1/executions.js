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

    const limitRaw = req.query?.limit || 50;
    const limit = Math.min(Number(limitRaw) || 50, 100);

    const { data, error } = await supabase
      .from("executions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return res.status(500).json({
        ok: false,
        error: "SUPABASE_QUERY_FAILED",
        detail: error.message
      });
    }

    return res.status(200).json({
      ok: true,
      count: data?.length || 0,
      executions: data || []
    });

  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: "INTERNAL_ERROR",
      detail: err.message || String(err)
    });
  }
}
