import { db } from "../../../../services/db.js";

import {
  resolveJwtContext,
  requireJwtPermission
} from "../../../../services/jwt-auth.js";

import {
  createGovernanceReview
} from "../../../../engine/governance-review-engine.js";

import {
  insertGovernanceEvent
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
      "governance.review.approve"
    );

    if (!permission.ok && context?.user?.role !== "OPERATOR") {
      return json(res, 401, {
        ok: false,
        error: {
          code: "INVALID_JWT",
          message: "Governance stabilization review permission required."
        }
      });
    }

    const body = req.body || {};
    const review_id = body.review_id || null;
    const execution_id = body.execution_id || crypto.randomUUID();
    const stability = body.stability || {};
    const actor = context?.user?.email || "operator@executia.io";
    const organization_id =
      context?.organization_id ||
      body.organization_id ||
      stability.organization_id ||
      null;

    const requiresStabilization =
      body.force === true ||
      (Array.isArray(stability.actions) &&
        stability.actions.includes("CREATE_STABILIZATION_REVIEW")) ||
      stability.collapse_probability === "HIGH" ||
      stability.continuity === "UNSTABLE";

    if (!requiresStabilization) {
      return json(res, 409, {
        ok: false,
        error: {
          code: "STABILIZATION_REVIEW_NOT_REQUIRED",
          message: "Governance stability does not currently require stabilization review."
        },
        stability
      });
    }

    const result = await createGovernanceReview({
      supabase: db(),
      request: {
        execution_id,
        actor,
        organization_id
      },
      governance: {
        organization_id,
        governance_decision: "BLOCK_COMMIT",
        reason: "GOVERNANCE_STABILITY_REVIEW_REQUIRED"
      },
      policy: {
        decision: "PENDING_REVIEW",
        reason: "GOVERNANCE_STABILITY_REVIEW_REQUIRED",
        risk_score: Number(body.risk_score || stability.score || 90)
      }
    });

    if (!result.ok) {
      return json(res, 400, {
        ok: false,
        scope: "EXECUTIA_GOVERNANCE_STABILIZATION_REVIEW",
        ...result
      });
    }

    const createdReviewId =
      result.review?.id ||
      result.review_id ||
      result.data?.id ||
      null;

    let event = null;

    if (createdReviewId) {
      event = await insertGovernanceEvent({
        supabase: db(),
        event: {
          review_id: createdReviewId,
          execution_id,
          actor,
          event_type: "GOVERNANCE_STABILIZATION_REVIEW_CREATED",
          payload: {
            source_review_id: review_id,
            reason: "GOVERNANCE_STABILITY_REVIEW_REQUIRED",
            stability_score: stability.score ?? null,
            continuity: stability.continuity || null,
            collapse_probability: stability.collapse_probability || null,
            quorum_failure_risk: stability.quorum_failure_risk || null,
            survivability: stability.survivability || null,
            actions: stability.actions || [],
            operator_user_id: context?.user?.id || null,
            operator_email: context?.user?.email || null,
            operator_role: context?.user?.role || context?.role || null
          }
        }
      });
    }

    return json(res, 201, {
      ok: true,
      scope: "EXECUTIA_GOVERNANCE_STABILIZATION_REVIEW",
      source_review_id: review_id,
      execution_id,
      stabilization_review_id: createdReviewId,
      review: result.review || result.data || result,
      event
    });
  } catch (error) {
    console.error("[EXECUTIA GOVERNANCE STABILIZATION REVIEW ERROR]", error);

    return json(res, 500, {
      ok: false,
      error: {
        code: error.code || "GOVERNANCE_STABILIZATION_REVIEW_FAILED",
        message:
          error.message ||
          "Governance stabilization review creation failed."
      }
    });
  }
}
