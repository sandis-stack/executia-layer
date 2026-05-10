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
          code: "METHOD_NOT_ALLOWED",
          message: "Only GET is allowed."
        }
      });
    }

    const context = await resolveJwtContext(req);

    const permission = requireJwtPermission(
      context,
      "governance.review.read"
    );

    if (!permission.ok && context?.user?.role !== "OPERATOR") {
      return json(res, permission.status || 401, {
        ok: false,
        error: {
          code: permission.error || "INVALID_JWT",
          message:
            permission.reason ||
            "Governance proof export permission required."
        }
      });
    }

    const supabase = db();

    const review_id =
      req.query.review_id ||
      req.query.reviewId ||
      null;

    let review = null;
    let events = [];
    let freezes = [];

    if (review_id) {
      const { data: reviewData, error: reviewError } = await supabase
        .from("governance_reviews")
        .select("*")
        .eq("id", review_id)
        .single();

      if (reviewError) throw reviewError;

      review = reviewData;

      const { data: reviewEvents, error: eventsError } = await supabase
        .from("governance_review_events")
        .select("*")
        .eq("review_id", review_id)
        .order("sequence_no", { ascending: true });

      if (eventsError) throw eventsError;

      events = reviewEvents || [];

      let freezeQuery = supabase
        .from("governance_freezes")
        .select("*")
        .or(
          `review_id.eq.${review_id},execution_id.eq.${review.execution_id},freeze_scope.eq.SYSTEM,freeze_scope.eq.ORGANIZATION`
        )
        .order("created_at", { ascending: true });

      if (context.organization_id) {
        freezeQuery = freezeQuery.eq(
          "organization_id",
          context.organization_id
        );
      }

      const { data: scopedFreezes, error: freezesError } =
        await freezeQuery;

      if (freezesError) throw freezesError;

      freezes = scopedFreezes || [];
    } else {
      let eventQuery = supabase
        .from("governance_review_events")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(500);

      const { data: globalEvents, error: globalEventsError } =
        await eventQuery;

      if (globalEventsError) throw globalEventsError;

      events = globalEvents || [];

      let freezeQuery = supabase
        .from("governance_freezes")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(200);

      if (context.organization_id) {
        freezeQuery = freezeQuery.eq(
          "organization_id",
          context.organization_id
        );
      }

      const { data: globalFreezes, error: globalFreezesError } =
        await freezeQuery;

      if (globalFreezesError) throw globalFreezesError;

      freezes = globalFreezes || [];
    }

    const freezeIds = (freezes || []).map((freeze) => freeze.id);

    let freezeEvents = [];

    if (freezeIds.length > 0) {
      const { data: fetchedFreezeEvents, error: freezeEventsError } =
        await supabase
          .from("governance_freeze_events")
          .select("*")
          .in("freeze_id", freezeIds)
          .order("created_at", { ascending: true });

      if (freezeEventsError) throw freezeEventsError;

      freezeEvents = fetchedFreezeEvents || [];
    }

    const verification =
      await verifyGovernanceHashChain({
        supabase,
        review_id: review_id || "GLOBAL"
      });

    const proof = {
      ok: true,
      type: review_id
        ? "EXECUTIA_GOVERNANCE_PROOF_PACKAGE"
        : "EXECUTIA_GLOBAL_GOVERNANCE_PROOF_PACKAGE",

      exported_at: new Date().toISOString(),

      mode: context.mode,
      organization_id: context.organization_id,
      user: context.user,

      scope: {
        review_id,
        global: !review_id
      },

      governance_review: review
        ? {
            id: review.id,
            execution_id: review.execution_id,
            review_status: review.review_status,
            governance_state: review.governance_state,
            execution_status: review.execution_status,
            escalation_level: review.escalation_level,
            created_at: review.created_at,
            updated_at: review.updated_at,
            committed_at: review.committed_at || null
          }
        : null,

      verification,

      governance_chain: {
        verified: verification.verified,
        head_hash: verification.head_hash || null,
        events_checked: verification.events_checked || 0,
        broken_at: verification.broken_at || null,
        reason: verification.reason || null
      },

      emergency_governance: {
        freezes: (freezes || []).map((freeze) => ({
          id: freeze.id,
          scope: freeze.freeze_scope,
          level: freeze.freeze_level,
          status: freeze.status,
          reason: freeze.freeze_reason,
          review_id: freeze.review_id,
          execution_id: freeze.execution_id,
          created_by: freeze.created_by_email,
          released_by: freeze.released_by_email,
          created_at: freeze.created_at,
          released_at: freeze.released_at,
          metadata: freeze.metadata || {}
        })),

        freeze_events: (freezeEvents || []).map((event) => ({
          id: event.id,
          freeze_id: event.freeze_id,
          event_type: event.event_type,
          actor: event.actor_email || event.actor_id,
          created_at: event.created_at,
          details: event.details || {}
        }))
      },

      events: (events || []).map((event) => ({
        id: event.id,
        review_id: event.review_id,
        execution_id: event.execution_id,
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
