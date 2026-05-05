import { db } from "../../services/db.js";
import { requireInternalKey } from "../../services/auth.js";
import { buildLedgerHash } from "../../services/core-ledger.js";
import { ok, fail, methodGuard } from "../../shared/response.js";

export default async function handler(req, res) {
  try {
    const auth = requireInternalKey(req);
    if (!auth.ok) return fail(res, "UNAUTHORIZED", "Invalid API key.", 401);
    if (!methodGuard(req, res, ["GET"])) return;

    const { data: anchors, error } = await db()
      .from("truth_anchors")
      .select("*")
      .order("anchored_at", { ascending: true });

    if (error) throw error;

    // Cross-check: for each anchor, verify the source record hash still matches
    let tampered = [];

    for (const anchor of anchors || []) {
      if (anchor.source_table !== "core_ledger") continue;

      const { data: row } = await db()
        .from("core_ledger")
        .select("hash")
        .eq("id", anchor.source_id)
        .single();

      if (!row || row.hash !== anchor.source_hash) {
        tampered.push({
          anchor_id:   anchor.id,
          source_id:   anchor.source_id,
          source_table: anchor.source_table,
          anchored_at: anchor.anchored_at
        });
      }
    }

    const verified = tampered.length === 0;

    return ok(res, {
      verified,
      anchors:    (anchors || []).length,
      type:       "INTERNAL_TIMESTAMP_PROOF",
      ...(tampered.length > 0 ? { tampered } : {})
    });

  } catch (err) {
    return fail(res, err.code || "TRUTH_ANCHOR_VERIFY_FAILED", err.message || "Verification failed.", 500);
  }
}
