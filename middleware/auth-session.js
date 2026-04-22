
import { createHash, timingSafeEqual } from "crypto";
import { createSupabaseAdmin } from "../services/supabase-admin.js";

function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}
function safeEqual(a,b){ const ab=Buffer.from(String(a)); const bb=Buffer.from(String(b)); if(ab.length!==bb.length) return false; return timingSafeEqual(ab,bb); }

export async function requireSession(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  if (!token) return next(new Error("UNAUTHORIZED_SESSION"));
  const supabase = createSupabaseAdmin();
  const tokenHash = sha256(token);
  const { data, error } = await supabase
    .from("operator_sessions")
    .select("id, operator_id, organization_id, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (error) return next(new Error(`SESSION_LOOKUP_FAILED: ${error.message}`));
  if (!data) return next(new Error("UNAUTHORIZED_SESSION"));
  if (new Date(data.expires_at).getTime() <= Date.now()) return next(new Error("SESSION_EXPIRED"));
  await supabase.from("operator_sessions").update({ last_used_at: new Date().toISOString() }).eq("id", data.id).then(()=>{}).catch(()=>{});
  req.executia = req.executia || {};
  req.executia.session = { sessionId: data.id, operatorId: data.operator_id, organizationId: data.organization_id };
  req.executia.operatorId = data.operator_id;
  req.executia.organizationId = req.executia.organizationId || data.organization_id;
  next();
}
