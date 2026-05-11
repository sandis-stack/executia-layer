import {
  resolveJwtContext,
  requireJwtPermission
} from "../../../../services/jwt-auth.js";

import { runGovernanceScheduler } from "../../../../services/governance-scheduler.js";

import { db } from "../../../../services/db.js";

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
      "governance.review.read"
    );

    if (!permission.ok && context?.user?.role !== "OPERATOR") {
      return json(res, 401, {
        ok: false,
        error: {
          code: "INVALID_JWT",
          message: "Governance daemon permission required."
        }
      });
    }

    const body = req.body || {};

    const limit =
      Number(body.limit || 10);

    const materialize_monitor_events =
      body.materialize_monitor_events === true;

    const statuses = [
      "OPEN",
      "QUORUM_PENDING",
      "FROZEN",
      "UNDER_SUPERVISION"
    ];

    const supabase = db();

    let query = supabase
      .from("governance_reviews")
      .select(`
        id,
        execution_id,
        review_status,
        governance_state,
        organization_id
      `)
      .in("review_status", statuses)
      .order("updated_at", {
        ascending: true
      })
      .limit(limit);

    if (context.organization_id) {
      query = query.eq(
        "organization_id",
        context.organization_id
      );
    }

    const {
      data,
      error
    } = await query;

    if (error) {
      throw error;
    }

    const scopes =
      (data || []).map((review) => ({
        review_id: review.id,
        execution_id: review.execution_id
      }));

    const scheduler =
      scopes.length
        ? await runGovernanceScheduler({
            scopes,
            actor:
              context?.user?.email ||
              "daemon@executia.io",
            operator: context?.user || null,
            materialize_monitor_events
          })
        : {
            ok: true,
            type:
              "EXECUTIA_GOVERNANCE_SCHEDULER_RUN",
            mode:
              "ONE_SHOT_AUTONOMOUS_RUNTIME_LOOP",
            cycles_requested: 0,
            cycles_completed: 0,
            materialized_events: 0,
            results: []
          };

    return json(res, 200, {
      ok: true,
      scope:
        "EXECUTIA_AUTONOMOUS_GOVERNANCE_DAEMON",
      daemon_state: "ACTIVE",
      mode:
        "ONE_SHOT_AUTONOMOUS_RUNTIME_LOOP",
      organization_id:
        context.organization_id,
      statuses,
      polled_reviews: scopes.length,
      ...scheduler
    });

  } catch (error) {

    console.error(
      "[EXECUTIA GOVERNANCE DAEMON ERROR]",
      error
    );

    return json(res, 500, {
      ok: false,
      error: {
        code:
          error.code ||
          "GOVERNANCE_DAEMON_FAILED",
        message:
          error.message ||
          "Governance daemon failed."
      }
    });
  }
}
