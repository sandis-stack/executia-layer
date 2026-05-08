import { db } from "../../services/db.js";
import { resolveJwtContext, requireJwtPermission } from "../../services/jwt-auth.js";
import { buildLedgerHash } from "../../services/core-ledger.js";
import { ok, fail, methodGuard } from "../../shared/response.js";

export default async function handler(req, res) {
  try {
    if (!methodGuard(req, res, ["GET"])) return;

    const context = await resolveJwtContext(req);
    const permission =
      requireJwtPermission(context, "audit").ok
        ? requireJwtPermission(context, "audit")
        : requireJwtPermission(context, "execute");

    if (!permission.ok) {
      return fail(
        res,
        permission.error || "UNAUTHORIZED",
        permission.reason || "JWT authentication or audit permission required.",
        permission.status || 401
      );
    }

    const { data, error } = await db()
      .from("core_ledger")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) throw error;

    let valid = true;
    let tampered_id = null;

    for (const row of data || []) {
      const expected = buildLedgerHash(row, row.prev_hash || "GENESIS");

      if (row.hash !== expected) {
        valid = false;
        tampered_id = row.id;
        break;
      }
    }

    return ok(res, {
      mode: context.mode,
      organization_id: context.organization_id,
      user: context.user,
      verified: valid,
      entries: (data || []).length,
      ...(tampered_id ? { tampered_id } : {})
    });

  } catch (err) {
    return fail(res, "CORE_LEDGER_VERIFY_FAILED", err.message, 500);
  }
}
