import { settleLedgerEntry, getAccountBalances, getPendingSettlements } from "../../services/settlement.js";
import { resolveJwtContext, requireJwtPermission } from "../../services/jwt-auth.js";
import { ok, fail } from "../../shared/response.js";

export default async function handler(req, res) {
  try {
    const context = await resolveJwtContext(req);
    const permission =
      requireJwtPermission(context, "audit").ok
        ? requireJwtPermission(context, "audit")
        : requireJwtPermission(context, "execute");

    if (!permission.ok) {
      return fail(
        res,
        permission.error || "UNAUTHORIZED",
        permission.reason || "JWT authentication or settlement permission required.",
        permission.status || 401
      );
    }

    if (req.method === "GET") {
      const [pending, accounts] = await Promise.all([
        getPendingSettlements(),
        getAccountBalances()
      ]);

      return ok(res, {
        mode: context.mode,
        organization_id: context.organization_id,
        user: context.user,
        pending,
        accounts
      });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
    }

    const { ledger_id } = req.body || {};

    if (!ledger_id) {
      return res.status(400).json({ ok: false, error: "LEDGER_ID_REQUIRED" });
    }

    const result = await settleLedgerEntry(ledger_id);

    return ok(res, {
      mode: context.mode,
      organization_id: context.organization_id,
      user: context.user,
      message: "LEDGER_SETTLED",
      ledger: result
    });

  } catch (err) {
    return fail(res, err.code || "SETTLEMENT_FAILED", err.message || "Settlement failed.", 500);
  }
}
