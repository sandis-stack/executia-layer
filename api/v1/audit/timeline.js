import { createClient } from "@supabase/supabase-js";
import ws from "ws";

function db() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { realtime: { transport: ws } }
  );
}

export default async function handler(req, res) {
  try {
    const execution_id = req.query.execution_id;

    if (!execution_id) {
      return res.status(400).json({
        ok: false,
        error: { code: "EXECUTION_ID_REQUIRED" }
      });
    }

    const supabase = db();

    const { data, error } = await supabase
      .from("audit_events")
      .select("*")
      .eq("execution_id", execution_id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return res.status(200).json({
      ok: true,
      mode: "AUDIT_TIMELINE",
      execution_id,
      items: data || []
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: {
        code: "AUDIT_TIMELINE_FAILED",
        message: e.message
      }
    });
  }
}
