import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      executions: [],
      error: "METHOD_NOT_ALLOWED"
    });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(200).json({
        ok: false,
        executions: [],
        error: "SUPABASE_ENV_MISSING"
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from("executions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return res.status(200).json({
        ok: false,
        executions: [],
        error: error.message
      });
    }

    return res.status(200).json({
      ok: true,
      executions: data || []
    });

  } catch (err) {
    return res.status(200).json({
      ok: false,
      executions: [],
      error: err.message || String(err)
    });
  }
}
