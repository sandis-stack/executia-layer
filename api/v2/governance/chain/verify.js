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
    if (req.method !== "GET") {
      return json(res, 405, {
        ok: false,
        error: {
          code: "METHOD_NOT_ALLOWED"
        }
      });
    }

    const context = await resolveJwtContext(req);

    const permission = requireJwtPermission(
      context,
      "governance.review.read"
    );

    if (!permission.ok && context?.user?.role !== "OPERATOR") {
      return json(res, 401, {
        ok: false,
        error: {
          code: "INVALID_JWT",
          message:
            permission.reason ||
            "Governance chain verification permission required."
        }
      });
    }

    const supabase = db();

    const { data: allEvents, error: allError } = await supabase
      .from("governance_review_events")
      .select("id, sequence_no, review_id, execution_id, actor, event_type, payload, prev_hash, hash, created_at")
      .order("sequence_no", { ascending: true });

    if (allError) throw allError;

    const events = (allEvents || []).filter((event) => event.hash);
    const unhashed_events = (allEvents || []).length - events.length;

    let previousHash = null;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];

      if ((event.prev_hash || null) !== previousHash) {
        return json(res, 200, {
          ok: true,
          verified: false,
          scope: "GLOBAL_GOVERNANCE_CHAIN",
          events_checked: i + 1,
          total_hashed_events: events.length,
          unhashed_events,
          broken_at: event.id,
          broken_sequence_no: event.sequence_no,
          reason: "PREV_HASH_MISMATCH",
          expected_prev_hash: previousHash,
          actual_prev_hash: event.prev_hash || null
        });
      }

      const recalculated = hashGovernanceEvent(event, previousHash);

      if (event.hash !== recalculated) {
        return json(res, 200, {
          ok: true,
          verified: false,
          scope: "GLOBAL_GOVERNANCE_CHAIN",
          events_checked: i + 1,
          total_hashed_events: events.length,
          unhashed_events,
          broken_at: event.id,
          broken_sequence_no: event.sequence_no,
          reason: "HASH_MISMATCH",
          expected_hash: recalculated,
          actual_hash: event.hash
        });
      }

      previousHash = event.hash;
    }

    return json(res, 200, {
      ok: true,
      verified: true,
      scope: "GLOBAL_GOVERNANCE_CHAIN",
      events_checked: events.length,
      total_hashed_events: events.length,
      unhashed_events,
      head_hash: previousHash,
      broken_at: null
    });
  } catch (error) {
    console.error("[EXECUTIA GLOBAL GOVERNANCE CHAIN VERIFY ERROR]", error);

    return json(res, 500, {
      ok: false,
      error: {
        code:
          error.code ||
          "GLOBAL_GOVERNANCE_CHAIN_VERIFY_FAILED",
        message:
          error.message ||
          "Global governance chain verification failed."
      }
    });
  }
}
