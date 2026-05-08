import { db } from "../../services/db.js";
import { resolveJwtContext, requireJwtPermission } from "../../services/jwt-auth.js";
import { buildLedgerHash } from "../../services/core-ledger.js";
import { ok, fail, methodGuard } from "../../shared/response.js";

export default async function handler(req, res) {
  try {
    if (!methodGuard(req, res, ["POST"])) return;

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

    let previousHash = "GENESIS";
    let repaired = 0;

    for (const row of data || []) {
      const nextHash = buildLedgerHash(row, previousHash);

      const { error: updateError } = await db()
        .from("core_ledger")
        .update({
          prev_hash: previousHash,
          hash: nextHash
        })
        .eq("id", row.id);

      if (updateError) throw updateError;

      previousHash = nextHash;
      repaired += 1;
    }

    return ok(res, {
      mode: context.mode,
      organization_id: context.organization_id,
      user: context.user,
      repaired: true,
      entries: repaired
    });

  } catch (err) {
    return fail(res, "CORE_LEDGER_REPAIR_FAILED", err.message || "Core ledger repair failed.", 500);
  }
}
