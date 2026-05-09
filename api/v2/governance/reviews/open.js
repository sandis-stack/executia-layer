import { createClient } from "@supabase/supabase-js";
import ws from "ws";

import {
  resolveJwtContext,
  requireJwtPermission
} from "../../../../services/jwt-auth.js";

function json(res, status, body) {
  return res.status(status).json(body);
}

function db() {
  if (
    !process.env.SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new Error("SUPABASE_ENV_MISSING");
  }

  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      realtime: {
        transport: ws
      }
    }
  );
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

    const permission =
      requireJwtPermission(
        context,
        "governance.review.read"
      );

    if (!permission.ok) {
      return json(res, permission.status || 403, {
        ok: false,
        error: {
          code: permission.error || "FORBIDDEN",
          message:
            permission.reason ||
            "Governance review read permission required.",
          role: context.role,
          permissions: context.permissions,
          user: context.user
        }
      });
    }

    const supabase = db();

    let query = supabase
      .from("governance_reviews")
      .select(`
        *,
        governance_review_events (
          id,
          actor,
          event_type,
          payload,
          created_at
        )
      `)
      .eq("review_status", "OPEN")
      .order("created_at", {
        ascending: false
      });

    if (context.organization_id) {
      query = query.eq(
        "organization_id",
        context.organization_id
      );
    }

    const {
      data,
      error
    } = await query.limit(100);

    if (error) {
      return json(res, 500, {
        ok: false,
        error: {
          code: "GOVERNANCE_OPEN_QUEUE_FAILED",
          message: error.message
        }
      });
    }

    const reviews =
      (data || []).map((review) => ({
        id: review.id,
        execution_id: review.execution_id,
        organization_id: review.organization_id,

        governance_decision:
          review.governance_decision,

        policy_decision:
          review.policy_decision,

        review_status:
          review.review_status,

        risk_score:
          review.risk_score,

        escalation_level:
          review.escalation_level,

        requested_by:
          review.requested_by,

        assigned_to:
          review.assigned_to,

        review_reason:
          review.review_reason,

        created_at:
          review.created_at,

        updated_at:
          review.updated_at,

        events:
          review.governance_review_events || []
      }));

    return json(res, 200, {
      ok: true,
      mode: context.mode,
      organization_id: context.organization_id,
      user: context.user,
      count: reviews.length,
      reviews
    });

  } catch (error) {

    console.error(
      "[EXECUTIA GOVERNANCE OPEN QUEUE ERROR]",
      error
    );

    return json(res, 500, {
      ok: false,
      error: {
        code:
          error.code ||
          "GOVERNANCE_OPEN_QUEUE_FAILED",
        message:
          error.message ||
          "Governance open queue failed."
      }
    });
  }
}
