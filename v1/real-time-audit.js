import { runRealTimeAudit } from "../../services/real-time-audit.js";
import { requireInternalKey } from "../../services/auth.js";
import { ok, fail, methodGuard } from "../../shared/response.js";

export default async function handler(req, res) {
  try {
    const auth = requireInternalKey(req);
    if (!auth.ok) return fail(res, "UNAUTHORIZED", "Invalid API key.", 401);
    if (!methodGuard(req, res, ["GET", "POST"])) return;

    const result = await runRealTimeAudit({
      source: "API_REAL_TIME_AUDIT",
      actor:  "system"
    });

    return ok(res, result);

  } catch (err) {
    return fail(res, err.code || "REAL_TIME_AUDIT_FAILED", err.message || "Real-time audit failed.", 500);
  }
}
