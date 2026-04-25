
import { withEngine } from "../middleware/with-engine.js";
import { requireSession } from "../middleware/auth-session.js";
import { createSupabaseAdmin } from "../services/supabase-admin.js";

export default withEngine(async (req,res)=>{
  const supabase = createSupabaseAdmin();
  const operatorId = req.executia.operatorId;
  const organizationId = req.executia.organizationId;
  const { data: operator, error } = await supabase.from("operators").select("id,email,role,status").eq("id", operatorId).eq("organization_id", organizationId).maybeSingle();
  if (error || !operator) return res.status(404).json({ ok:false, error_code:"OPERATOR_NOT_FOUND", error_message:error?.message || 'Operator not found', request_id:req.executia.requestId });
  return res.status(200).json({ ok:true, operator, organization_id:organizationId, request_id:req.executia.requestId });
}, { methods:["GET"], requireAuth:false, rateLimit:true, sessionAuth:true });
