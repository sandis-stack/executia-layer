import { createClient } from "@supabase/supabase-js";
import ws from "ws";

import {
  resolveJwtContext,
  requireJwtPermission
} from "../../../../services/jwt-auth.js";

import {
  finalizeGovernanceReview
} from "../../../../services/governance-review-actions.js";

import { resumeGovernedExecution } from "../../../../engine/execution-resume-engine.js";

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
        endpoint: "/api/v2/governance/review/approve",
        method: "POST",
        purpose: "Approve governance review escalation."
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
        "governance.review.approve"
      );

    if (!permission.ok) {
      return json(res, permission.status || 401, {
        ok: false,
        error: {
          code: permission.error || "UNAUTHORIZED",
          message:
            permission.reason ||
            "Governance review approval permission required."
        }
      });
    }

    const body = req.body || {};

    const result =
      await finalizeGovernanceReview({
        supabase: db(),
        review_id:
          body.review_id ||
          body.reviewId,
        action: "APPROVE",
        context,
        body
      });

    if (!result.ok) {
      return json(res, 400, result);
    }

    const review_id = body.review_id || body.reviewId;

    const resumeResult = await resumeGovernedExecution({
      review_id,
      operator_id:     context.user?.id,
      organization_id: context.organization_id
    });

    return json(res, 200, {
      ok:          true,
      governance:  result,
      resume:      resumeResult
    });

  } catch (error) {

    console.error(
      "[EXECUTIA GOVERNANCE APPROVE ERROR]",
      error
    );

    return json(res, 500, {
      ok: false,
      error: {
        code:
          error.code ||
          "GOVERNANCE_APPROVAL_FAILED",
        message:
          error.message ||
          "Governance approval failed."
      }
    });
  }
}
