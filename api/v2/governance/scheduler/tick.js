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
          message: "Governance daemon tick permission required."
        }
      });
    }

    const body = req.body || {};
    const limit = Math.min(Number(body.limit || 10), 50);
    const materialize_monitor_events =
      body.materialize_monitor_events === true;

    const statuses = Array.isArray(body.statuses) && body.statuses.length
      ? body.statuses
      : ["OPEN", "QUORUM_PENDING", "FROZEN", "UNDER_SUPERVISION"];

    let query = db()
      .from("governance_reviews")
      .select("id, execution_id, organization_id, review_status, governance_decision, policy_decision, risk_score, escalation_level, created_at, updated_at")
      .in("review_status", statuses)
      .order("updated_at", { ascending: true })
      .limit(limit);

    if (context.organization_id) {
      query = query.eq("organization_id", context.organization_id);
    }

    const { data: reviews, error } = await query;

    if (error) {
      return json(res, 500, {
        ok: false,
        error: {
          code: "DAEMON_TICK_QUERY_FAILED",
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
        scope: "EXECUTIA_GOVERNANCE_DAEMON_TICK",
        mode: "CONTINUOUS_RUNTIME_TICK",
        organization_id: context.organization_id,
        daemon_state: "IDLE",
        polled_reviews: 0,
        statuses,
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
      scope: "EXECUTIA_GOVERNANCE_DAEMON_TICK",
      mode: "CONTINUOUS_RUNTIME_TICK",
      daemon_state: "ACTIVE",
      organization_id: context.organization_id,
      polled_reviews: reviews?.length || 0,
      statuses,
      ...result
    });

  } catch (error) {
    console.error("[EXECUTIA GOVERNANCE DAEMON TICK ERROR]", error);

    return json(res, 500, {
      ok: false,
      error: {
        code:
          error.code ||
          "GOVERNANCE_DAEMON_TICK_FAILED",
        message:
          error.message ||
          "Governance daemon tick failed."
      }
    });
  }
}
