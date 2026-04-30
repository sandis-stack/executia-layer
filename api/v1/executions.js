import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "https://executia.io");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ ok: false, error: "SUPABASE_ENV_MISSING" });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const limitRaw = req.query?.limit || 20;
    const limit = Math.min(Number(limitRaw) || 20, 100);

    const { data, error } = await supabase
      .from("executions")
      .select("id, result, validation, status, truth_hash, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return res.status(500).json({
        ok: false,
        error: "EXECUTIONS_READ_FAILED",
        message: error.message
      });
    }

    return res.status(200).json({
      ok: true,
      source: "EXECUTIA_ENGINE",
      count: data?.length || 0,
      executions: data || []
    });

  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: "ENGINE_ERROR",
      message: err.message || String(err)
    });
  }
}
