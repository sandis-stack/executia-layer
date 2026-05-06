import { db } from "../../services/db.js";
import { requireInternalKey } from "../../services/auth.js";

export default async function handler(req, res) {
  try {
    const auth = requireInternalKey(req);

    if (!auth.ok) {
      return res.status(401).json({
        ok: false,
        error: "UNAUTHORIZED"
      });
    }

    const execution_id = req.query?.execution_id;

    if (!execution_id) {
      return res.status(400).json({
        ok: false,
        error: "EXECUTION_ID_REQUIRED"
      });
    }

    const { data, error } = await db()
      .from("audit_events")
      .select("*")
      .eq("execution_id", execution_id)
      .order("created_at", { ascending: true });

    if (error) {
      return res.status(500).json({
        ok: false,
        error: error.message
      });
    }

    return res.status(200).json({
      ok: true,
      execution_id,
      timeline: data || []
    });

  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message || "TIMELINE_FAILED"
    });
  }
}
