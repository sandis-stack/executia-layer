import { withEngine } from "../middleware/with-engine.js";
import { createSupabaseAdmin } from "../services/supabase-admin.js";

export default withEngine(async (req, res) => {
  const supabase = createSupabaseAdmin();
  const orgId = req.executia.organizationId;
  const limit = Math.min(Math.max(Number(req.query.limit || 25), 1), 100);
  const offset = Math.max(Number(req.query.offset || 0), 0);
  const { data, error, count } = await supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) return res.status(500).json({ ok: false, error_code: "AUDIT_FETCH_FAILED", error_message: error.message, request_id: req.executia.requestId });
  return res.status(200).json({ ok: true, items: data || [], page: { limit, offset, total: count ?? (data || []).length, has_more: (offset + limit) < (count ?? 0) }, request_id: req.executia.requestId });
}, { methods: ["GET"], requireAuth: true, rateLimit: true, requiredScope: "read" });
