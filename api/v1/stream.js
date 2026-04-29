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
    {
      auth: { persistSession: false }
    }
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
    const db = getSupabaseAdmin();

    const limit = Number(req.query.limit || 25);

    const { data, error } = await db
      .from("execution_ledger")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("STREAM_FETCH_FAILED:", error);
      throw new Error("STREAM_FETCH_FAILED");
    }

    return res.status(200).json({
      ok: true,
      executions: data || [],
      count: (data || []).length,
      at: new Date().toISOString()
    });

  } catch (error) {
    console.error("STREAM_ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "STREAM_ERROR"
    });
  }
}
