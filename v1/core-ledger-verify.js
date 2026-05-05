import { db } from "../../services/db.js";
import { requireInternalKey } from "../../services/auth.js";
import { buildLedgerHash } from "../../services/core-ledger.js";
import { ok, fail, methodGuard } from "../../shared/response.js";

export default async function handler(req, res) {
  try {
    const auth = requireInternalKey(req);
    if (!auth.ok) return fail(res, "UNAUTHORIZED", "Invalid API key.", 401);
    if (!methodGuard(req, res, ["GET"])) return;

    const { data, error } = await db()
      .from("core_ledger")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) throw error;

    let prevHash = "GENESIS";
    let valid = true;
    let tampered_id = null;

    for (const row of data || []) {
      const expected = buildLedgerHash(row, row.prev_hash || "GENESIS");

      if (row.hash !== expected) {
        valid = false;
        tampered_id = row.id;
        break;
      }

      prevHash = row.hash;
    }

    return ok(res, {
      verified: valid,
      entries:  (data || []).length,
      ...(tampered_id ? { tampered_id } : {})
    });

  } catch (err) {
    return fail(res, "CORE_LEDGER_VERIFY_FAILED", err.message, 500);
  }
}
