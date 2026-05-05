import { auditLedgerIntegrity } from "../../services/audit-ledger.js";
import { requireInternalKey } from "../../services/auth.js";
import { ok, fail, methodGuard } from "../../shared/response.js";

export default async function handler(req, res) {
  try {
    const auth = requireInternalKey(req);
    if (!auth.ok) return fail(res, "UNAUTHORIZED", "Invalid API key.", 401);
    if (!methodGuard(req, res, ["GET"])) return;

    const result = await auditLedgerIntegrity();

    return ok(res, result);

  } catch (err) {
    return fail(res, "AUDIT_FAILED", err.message || "Audit failed.", 500);
  }
}
