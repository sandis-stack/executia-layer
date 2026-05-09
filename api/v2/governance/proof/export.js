import { db } from "../../../../services/db.js";

import {
  resolveJwtContext,
  requireJwtPermission
} from "../../../../services/jwt-auth.js";

import {
  verifyGovernanceHashChain
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
            "Governance proof export permission required."
        }
      });
    }

    const review_id = req.query.review_id;

    if (!review_id) {
      return json(res, 400, {
        ok: false,
        error: {
          code: "REVIEW_ID_REQUIRED"
        }
      });
    }

    const supabase = db();

    const { data: review, error: reviewError } = await supabase
      .from("governance_reviews")
      .select("*")
      .eq("id", review_id)
      .single();

    if (reviewError) throw reviewError;

    const { data: events, error: eventsError } = await supabase
      .from("governance_review_events")
      .select("*")
      .eq("review_id", review_id)
      .order("sequence_no", { ascending: true });

    if (eventsError) throw eventsError;

    const verification =
      await verifyGovernanceHashChain({
        supabase,
        review_id
      });

    const proof = {
      ok: true,
      type: "EXECUTIA_GOVERNANCE_PROOF_PACKAGE",
      exported_at: new Date().toISOString(),

      governance_review: {
        id: review.id,
        execution_id: review.execution_id,
        status: review.status,
        governance_state: review.governance_state,
        escalation_level: review.escalation_level,
        created_at: review.created_at,
        updated_at: review.updated_at
      },

      verification,

      governance_chain: {
        verified: verification.verified,
        head_hash: verification.head_hash || null,
        events_checked: verification.events_checked || 0
      },

      events: (events || []).map((event) => ({
        id: event.id,
        sequence_no: event.sequence_no,
        event_type: event.event_type,
        actor: event.actor,
        prev_hash: event.prev_hash,
        hash: event.hash,
        created_at: event.created_at,
        payload: event.payload || {}
      }))
    };

    return json(res, 200, proof);

  } catch (error) {

    console.error(
      "[EXECUTIA GOVERNANCE PROOF EXPORT ERROR]",
      error
    );

    return json(res, 500, {
      ok: false,
      error: {
        code:
          error.code ||
          "GOVERNANCE_PROOF_EXPORT_FAILED",
        message:
          error.message ||
          "Governance proof export failed."
      }
    });

  }
}
