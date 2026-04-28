import { getSupabaseAdmin } from "../../services/supabase-admin.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      error: "METHOD_NOT_ALLOWED"
    });
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("execution_ledger")
    .select("id, status, decision, created_at, truth_hash")
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) {
    return res.status(500).json({
      ok: false,
      error: "STREAM_READ_FAILED",
      message: error.message
    });
  }

  return res.status(200).json({
    ok: true,
    mode: "READ_ONLY",
    source: "execution_ledger",
    events: data
  });
}
