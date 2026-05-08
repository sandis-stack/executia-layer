import { createClient } from "@supabase/supabase-js";
import ws from "ws";

import {
  resolveJwtContext,
  requireJwtPermission
} from "../../../../services/jwt-auth.js";

import {
  finalizeGovernanceReview
} from "../../../../services/governance-review-actions.js";

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

    if (req.method === "GET") {
      return json(res, 200, {
        ok: true,
        endpoint: "/api/v2/governance/review/override",
        method: "POST",
        purpose: "Override governance review escalation with immutable audit trail."
      });
    }

    if (req.method !== "POST") {
      return json(res, 405, {
        ok: false,
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: "Only GET and POST are allowed."
        }
      });
    }

    const context = await resolveJwtContext(req);

    const permission =
      requireJwtPermission(
        context,
        "governance.review.override"
      );

    if (!permission.ok) {
      return json(res, permission.status || 401, {
        ok: false,
        error: {
          code: permission.error || "UNAUTHORIZED",
          message:
            permission.reason ||
            "Governance override permission required."
        }
      });
    }

    const body = req.body || {};

    if (!body.reason && !body.review_reason) {
      return json(res, 400, {
        ok: false,
        error: {
          code: "OVERRIDE_REASON_REQUIRED",
          message: "Governance override requires a reason."
        }
      });
    }

    const result =
      await finalizeGovernanceReview({
        supabase: db(),
        review_id:
          body.review_id ||
          body.reviewId,
        action: "OVERRIDE",
        context,
        body
      });

    if (!result.ok) {
      return json(res, 400, result);
    }

    return json(res, 200, {
      ok: true,
      mode: context.mode,
      organization_id: context.organization_id,
      user: context.user,
      governance_review: result
    });

  } catch (error) {

    console.error(
      "[EXECUTIA GOVERNANCE OVERRIDE ERROR]",
      error
    );

    return json(res, 500, {
      ok: false,
      error: {
        code:
          error.code ||
          "GOVERNANCE_OVERRIDE_FAILED",
        message:
          error.message ||
          "Governance override failed."
      }
    });
  }
}
