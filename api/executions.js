import { withEngine } from "../middleware/with-engine.js";
import { createSupabaseAdmin } from "../services/supabase-admin.js";
 
export default withEngine(async (req, res) => {
  const supabase = createSupabaseAdmin();
  const orgId = req.executia.organizationId;
  const limit = Math.min(Math.max(Number(req.query.limit || 25), 1), 100);
  const offset = Math.max(Number(req.query.offset || 0), 0);
  const q = (req.query.q || "").trim();
 
  const { data, error } = await supabase
    .from("executions")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);
 
  if (error) return res.status(500).json({ ok: false, error_code: "EXECUTION_FETCH_FAILED", error_message: error.message, request_id: req.executia.requestId });
  return res.status(200).json({
    ok: true,
    items: data || []
  });
}, { methods: ["GET"], requireAuth: true, rateLimit: true });
 
