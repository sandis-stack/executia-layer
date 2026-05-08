import { resolveJwtContext, requireJwtPermission } from "../../../services/jwt-auth.js";
import { repairAuditChain } from "../../../services/audit.js";
import { ok, fail, methodGuard } from "../../../shared/response.js";

export default async function handler(req, res) {
  try {
    if (!methodGuard(req, res, ["POST"])) return;

    const context = await resolveJwtContext(req);
    const permission =
      requireJwtPermission(context, "audit").ok
        ? requireJwtPermission(context, "audit")
        : requireJwtPermission(context, "execute");

    if (!permission.ok) {
      return fail(res, permission.error || "UNAUTHORIZED", permission.reason || "JWT authentication required.", permission.status || 401);
    }

    const execution_id = req.body?.execution_id || req.query.execution_id || null;
    const result = await repairAuditChain(execution_id);

    return ok(res, {
      mode: context.mode,
      organization_id: context.organization_id,
      user: context.user,
      ...result
    });
  } catch (err) {
    return fail(res, "AUDIT_REPAIR_FAILED", err.message || "Audit repair failed.", 500);
  }
}
