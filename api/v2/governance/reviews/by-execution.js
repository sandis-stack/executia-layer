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
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
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
    const permission = requireJwtPermission(context, "governance.review.read");

    if (!permission.ok) {
      return json(res, permission.status || 401, {
        ok: false,
        error: {
          code: permission.error || "UNAUTHORIZED",
          message: permission.reason || "Governance review read permission required."
        }
      });
    }

    const execution_id =
      req.query.execution_id ||
      req.query.executionId ||
      null;

    if (!execution_id) {
      return json(res, 400, {
        ok: false,
        error: {
          code: "EXECUTION_ID_REQUIRED",
          message: "execution_id is required."
        }
      });
    }

    const supabase = db();

    let reviewQuery = supabase
      .from("governance_reviews")
      .select("*")
      .eq("execution_id", execution_id)
      .order("created_at", { ascending: false });

    if (context.organization_id) {
      reviewQuery = reviewQuery.eq("organization_id", context.organization_id);
    }

    const { data: reviews, error: reviewError } = await reviewQuery.limit(20);

    if (reviewError) {
      return json(res, 500, {
        ok: false,
        error: {
          code: "GOVERNANCE_REVIEW_LOOKUP_FAILED",
          message: reviewError.message
        }
      });
    }

    const { data: events, error: eventError } = await supabase
      .from("governance_review_events")
      .select("*")
      .eq("execution_id", execution_id)
      .order("created_at", { ascending: true })
      .limit(200);

    if (eventError) {
      return json(res, 500, {
        ok: false,
        error: {
          code: "GOVERNANCE_REVIEW_EVENTS_LOOKUP_FAILED",
          message: eventError.message
        }
      });
    }

    return json(res, 200, {
      ok: true,
      mode: context.mode,
      organization_id: context.organization_id,
      user: context.user,
      execution_id,
      reviews: reviews || [],
      events: events || [],
      total_reviews: reviews?.length || 0,
      total_events: events?.length || 0
    });

  } catch (error) {
    console.error("[EXECUTIA GOVERNANCE BY EXECUTION ERROR]", error);

    return json(res, 500, {
      ok: false,
      error: {
        code: error.code || "GOVERNANCE_BY_EXECUTION_FAILED",
        message: error.message || "Governance by execution lookup failed."
      }
    });
  }
}
