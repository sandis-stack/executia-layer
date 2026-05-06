import { settleLedgerEntry, getAccountBalances, getPendingSettlements } from "../../services/settlement.js";
import { requireInternalKey } from "../../services/auth.js";
import { ok, fail } from "../../shared/response.js";

export default async function handler(req, res) {
  try {
    const auth = requireInternalKey(req);
    if (!auth.ok) return res.status(401).json({ ok: false, error: auth.error || "UNAUTHORIZED" });

    // GET — list pending + account balances
    if (req.method === "GET") {
      const [pending, accounts] = await Promise.all([
        getPendingSettlements(),
        getAccountBalances()
      ]);
      return ok(res, { pending, accounts });
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
      message: "LEDGER_SETTLED",
      ledger:  result
    });

  } catch (err) {
    return fail(res, err.code || "SETTLEMENT_FAILED", err.message || "Settlement failed.", 500);
  }
}
