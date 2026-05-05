import { commitCoreLedgerTransaction } from "../../services/core-ledger.js";
import { requireInternalKey } from "../../services/auth.js";
import { fail } from "../../shared/response.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
    }

    const auth = requireInternalKey(req);
    if (!auth.ok) {
      return res.status(401).json({ ok: false, error: auth.error || "UNAUTHORIZED" });
    }

    const body = req.body || {};

    if (!body.actor) {
      return res.status(400).json({ ok: false, error: "ACTOR_REQUIRED" });
    }
    if (!body.transaction_type) {
      return res.status(400).json({ ok: false, error: "TRANSACTION_TYPE_REQUIRED" });
    }

    const result = await commitCoreLedgerTransaction(body);

    return res.status(200).json({
      ok:      true,
      message: "TRANSACTION_COMMITTED_AS_TRUTH",
      ledger:  result
    });

  } catch (err) {
    return res.status(500).json({
      ok:    false,
      error: err.code || err.message || "CORE_LEDGER_COMMIT_FAILED"
    });
  }
}
