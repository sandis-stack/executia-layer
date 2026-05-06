import { ok } from "../../shared/response.js";
import { hasSupabaseEnv } from "../../services/db.js";

export default function handler(req, res) {
  const hasApiKey = !!(process.env.EXECUTIA_API_KEY || process.env.EXECUTIA_INTERNAL_KEY);
  const keyEnvName = process.env.EXECUTIA_API_KEY
    ? "EXECUTIA_API_KEY"
    : process.env.EXECUTIA_INTERNAL_KEY
      ? "EXECUTIA_INTERNAL_KEY"
      : null;

  return ok(res, {
    status:    "OK",
    system:    "EXECUTIA™",
    mode:      "FINAL_FULL_LAYER",
    engine:    "BANK_LEVEL_EXECUTION_TRUTH",
    supabase:  hasSupabaseEnv() ? "CONFIGURED" : "DRY_RUN",
    auth: {
      configured: hasApiKey,
      env_var:    keyEnvName || "NOT_SET",
      hint:       hasApiKey
        ? "Send x-api-key or x-executia-key header with POST /api/v1/execute"
        : "Set EXECUTIA_API_KEY in Vercel Environment Variables and redeploy"
    },
    timestamp: new Date().toISOString()
  });
}
