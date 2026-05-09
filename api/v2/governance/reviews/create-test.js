import { db } from "../../../../services/db.js";

import {
  resolveJwtContext,
  requireJwtPermission
} from "../../../../services/jwt-auth.js";

import {
  createGovernanceReview
} from "../../../../engine/governance-review-engine.js";

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
          message: "Governance test review permission required."
        }
      });
    }

    const body = req.body || {};
    const risk_score = Number(body.risk_score || 85);

    const result = await createGovernanceReview({
      supabase: db(),
      request: {
        execution_id: body.execution_id || crypto.randomUUID(),
        actor: context?.user?.email || "operator@executia.io",
        organization_id: context?.organization_id || body.organization_id || null
      },
      governance: {
        organization_id: context?.organization_id || body.organization_id || null,
        governance_decision: "ALLOW_COMMIT",
        reason: "TEST_QUORUM_GOVERNANCE_REVIEW"
      },
      policy: {
        decision: "PENDING_REVIEW",
        reason: "TEST_QUORUM_GOVERNANCE_REVIEW",
        risk_score
      }
    });

    return json(res, result.ok ? 201 : 400, {
      ok: result.ok,
      scope: "EXECUTIA_TEST_GOVERNANCE_REVIEW",
      ...result
    });
  } catch (error) {
    console.error("[EXECUTIA TEST GOVERNANCE REVIEW ERROR]", error);

    return json(res, 500, {
      ok: false,
      error: {
        code: error.code || "TEST_GOVERNANCE_REVIEW_FAILED",
        message: error.message || "Test governance review failed."
      }
    });
  }
}
