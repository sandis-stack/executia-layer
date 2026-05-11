import { db } from "../../../../services/db.js";

import {
  resolveJwtContext,
  requireJwtPermission
} from "../../../../services/jwt-auth.js";

import {
  runGovernanceScheduler
} from "../../../../services/governance-scheduler.js";

function json(res, status, body) {
  return res.status(status).json(body);
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
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
      "governance.review.approve"
    );

    if (!permission.ok && context?.user?.role !== "OPERATOR") {
      return json(res, 401, {
        ok: false,
        error: {
          code: "INVALID_JWT",
          message: "Governance scheduler polling permission required."
        }
      });
    }

    const body = req.body || {};
    const limit = Math.min(Number(body.limit || 25), 100);
    const materialize_monitor_events =
      body.materialize_monitor_events === true;

    let query = db()
      .from("governance_reviews")
      .select("id, execution_id, organization_id, review_status, governance_decision, policy_decision, risk_score, escalation_level, created_at, updated_at")
      .eq("review_status", "OPEN")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (context.organization_id) {
      query = query.eq("organization_id", context.organization_id);
    }

    const { data: reviews, error } = await query;

    if (error) {
      return json(res, 500, {
        ok: false,
        error: {
          code: "SCHEDULER_POLL_QUERY_FAILED",
          message: error.message
        }
      });
    }

    const scopes = (reviews || [])
      .map((review) => ({
        review_id: review.id,
        execution_id: review.execution_id || null
      }))
      .filter((scope) => scope.review_id || scope.execution_id);

    if (!scopes.length) {
      return json(res, 200, {
        ok: true,
        scope: "EXECUTIA_GOVERNANCE_SCHEDULER_POLL",
        mode: "OPEN_REVIEW_POLL",
        organization_id: context.organization_id,
        polled_reviews: 0,
        cycles_requested: 0,
        cycles_completed: 0,
        materialized_events: 0,
        results: []
      });
    }

    const result = await runGovernanceScheduler({
      scopes,
      actor: context?.user?.email || "operator@executia.io",
      operator: {
        id: context?.user?.id || null,
        email: context?.user?.email || null,
        role: context?.user?.role || context?.role || null
      },
      materialize_monitor_events
    });

    return json(res, 201, {
      ok: true,
      scope: "EXECUTIA_GOVERNANCE_SCHEDULER_POLL",
      mode: "OPEN_REVIEW_POLL",
      organization_id: context.organization_id,
      polled_reviews: reviews?.length || 0,
      ...result
    });

  } catch (error) {
    console.error("[EXECUTIA GOVERNANCE SCHEDULER POLL ERROR]", error);

    return json(res, 500, {
      ok: false,
      error: {
        code:
          error.code ||
          "GOVERNANCE_SCHEDULER_POLL_FAILED",
        message:
          error.message ||
          "Governance scheduler polling failed."
      }
    });
  }
}
