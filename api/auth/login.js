
import { randomBytes, createHash, timingSafeEqual } from "crypto";
import { withEngine } from "../middleware/with-engine.js";
import { createSupabaseAdmin } from "../services/supabase-admin.js";
import { logAudit } from "../services/audit.js";

function sha256(v){ return createHash("sha256").update(String(v)).digest("hex"); }
function safeEqual(a,b){ const ab=Buffer.from(String(a)); const bb=Buffer.from(String(b)); if(ab.length!==bb.length) return false; return timingSafeEqual(ab,bb); }

export default withEngine(async (req,res)=>{
  const { email, password, organizationId } = req.body || {};
  if (!email || !password || !organizationId) {
    return res.status(400).json({ ok:false, error_code:"INVALID_LOGIN", error_message:"email, password, organizationId required", request_id:req.executia.requestId });
  }
  const supabase = createSupabaseAdmin();
  const { data: operator, error } = await supabase.from("operators").select("id, email, role, status, password_hash, organization_id").eq("email", String(email).toLowerCase()).eq("organization_id", organizationId).maybeSingle();
  if (error || !operator || operator.status !== 'active') return res.status(401).json({ ok:false, error_code:"LOGIN_FAILED", error_message:"Invalid credentials", request_id:req.executia.requestId });
  const expected = operator.password_hash || process.env.EXECUTIA_OPERATOR_BOOTSTRAP_PASSWORD_HASH || null;
  if (!expected || !safeEqual(sha256(password), expected)) return res.status(401).json({ ok:false, error_code:"LOGIN_FAILED", error_message:"Invalid credentials", request_id:req.executia.requestId });
  const token = randomBytes(24).toString("hex");
  const session = { id:`sess_${Date.now()}_${operator.id.slice(-6)}`, operator_id:operator.id, organization_id:organizationId, token_hash:sha256(token), expires_at:new Date(Date.now()+1000*60*60*12).toISOString() };
  const { error: insErr } = await supabase.from("operator_sessions").insert(session);
  if (insErr) return res.status(500).json({ ok:false, error_code:"SESSION_CREATE_FAILED", error_message:insErr.message, request_id:req.executia.requestId });
  await supabase.from("operators").update({ last_login_at: new Date().toISOString() }).eq("id", operator.id).then(()=>{}).catch(()=>{});
  await logAudit(supabase, { organization_id:organizationId, actor_type:"operator", actor_id:operator.id, actor_label:operator.email, action:"OPERATOR_LOGIN", entity:"session", entity_id:session.id, status:"ok", request_id:req.executia.requestId, payload:{ role:operator.role } });
  return res.status(200).json({ ok:true, token, expires_at:session.expires_at, operator:{ id:operator.id, email:operator.email, role:operator.role }, request_id:req.executia.requestId });
}, { methods:["POST"], requireAuth:false, rateLimit:true });
