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
      return json(res, permission.status || 401, {
        ok: false,
        error: {
          code: permission.error || "UNAUTHORIZED",
          message:
            permission.reason ||
            "Governance timeline permission required."
        }
      });
    }

    const execution_id =
      req.query.execution_id ||
      req.query.executionId ||
      null;

    const review_id =
      req.query.review_id ||
      req.query.reviewId ||
      null;

    const supabase = db();

    let reviewQuery = supabase
      .from("governance_reviews")
      .select("*")
      .order("created_at", {
        ascending: false
      });

    if (context.organization_id) {
      reviewQuery = reviewQuery.eq(
        "organization_id",
        context.organization_id
      );
    }

    if (execution_id) {
      reviewQuery = reviewQuery.eq(
        "execution_id",
        execution_id
      );
    }

    if (review_id) {
      reviewQuery = reviewQuery.eq(
        "id",
        review_id
      );
    }

    const {
      data: reviews,
      error: reviewsError
    } = await reviewQuery.limit(50);

    if (reviewsError) {
      return json(res, 500, {
        ok: false,
        error: {
          code: "GOVERNANCE_TIMELINE_FAILED",
          message: reviewsError.message
        }
      });
    }

    let eventQuery = supabase
      .from("governance_review_events")
      .select("*")
      .order("created_at", {
        ascending: true
      });

    if (execution_id) {
      eventQuery = eventQuery.eq(
        "execution_id",
        execution_id
      );
    }

    if (review_id) {
      eventQuery = eventQuery.eq(
        "review_id",
        review_id
      );
    }

    const {
      data: events,
      error: eventsError
    } = await eventQuery.limit(500);

    if (eventsError) {
      return json(res, 500, {
        ok: false,
        error: {
          code: "GOVERNANCE_TIMELINE_EVENTS_FAILED",
          message: eventsError.message
        }
      });
    }

    return json(res, 200, {
      ok: true,
      mode: context.mode,
      organization_id: context.organization_id,
      user: context.user,

      filters: {
        execution_id,
        review_id
      },

      reviews: reviews || [],
      events: events || [],

      total_reviews:
        reviews?.length || 0,

      total_events:
        events?.length || 0
    });

  } catch (error) {

    console.error(
      "[EXECUTIA GOVERNANCE TIMELINE ERROR]",
      error
    );

    return json(res, 500, {
      ok: false,
      error: {
        code:
          error.code ||
          "GOVERNANCE_TIMELINE_FAILED",
        message:
          error.message ||
          "Governance timeline failed."
      }
    });
  }
}
