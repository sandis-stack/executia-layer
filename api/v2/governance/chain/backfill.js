import { db } from "../../../../services/db.js";

import {
  resolveJwtContext,
  requireJwtPermission
} from "../../../../services/jwt-auth.js";

import {
  hashGovernanceEvent
} from "../../../../services/governance-hash.js";

function json(res, status, body) {
  return res.status(status).json(body);
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return json(res, 405, {
        ok: false,
        error: { code: "METHOD_NOT_ALLOWED" }
      });
    }

    const context = await resolveJwtContext(req);

    const permission = requireJwtPermission(
      context,
      "governance.review.override"
    );

    if (!permission.ok) {
      return json(res, 401, {
        ok: false,
        error: {
          code: "INVALID_JWT",
          message:
            permission.reason ||
            "Governance override permission required."
        }
      });
    }

    const supabase = db();

    const { data: events, error } = await supabase
      .from("governance_review_events")
      .select("*")
      .order("sequence_no", { ascending: true });

    if (error) throw error;

    let previousHash = null;
    let updated = 0;

    for (const event of events || []) {
      const nextHash = hashGovernanceEvent(event, previousHash);

      const { error: updateError } = await supabase
        .from("governance_review_events")
        .update({
          prev_hash: previousHash,
          hash: nextHash
        })
        .eq("id", event.id);

      if (updateError) throw updateError;

      previousHash = nextHash;
      updated++;
    }

    return json(res, 200, {
      ok: true,
      scope: "GLOBAL_GOVERNANCE_CHAIN_BACKFILL",
      updated_events: updated,
      head_hash: previousHash
    });
  } catch (error) {
    console.error("[EXECUTIA GOVERNANCE CHAIN BACKFILL ERROR]", error);

    return json(res, 500, {
      ok: false,
      error: {
        code:
          error.code ||
          "GOVERNANCE_CHAIN_BACKFILL_FAILED",
        message:
          error.message ||
          "Governance chain backfill failed."
      }
    });
  }
}
