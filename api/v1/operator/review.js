import { materializeOperatorGovernanceDecision } from "../../../services/public-proof-registry.js";
import { authorizeOperatorReview } from "../../../services/jwt-auth.js";
import { unauthorizedResponse } from "../../../services/auth.js";

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        ok: false,
        error: {
          code: "METHOD_NOT_ALLOWED"
        }
      });
    }

    const body = req.body || {};
    const auth = await authorizeOperatorReview(req, { decision: body.decision });
    if (!auth.ok) {
      return res.status(auth.status || 401).json(unauthorizedResponse());
    }

    const result = await materializeOperatorGovernanceDecision({
      reviewId: body.review_id,
      decision: body.decision,
      operator: body.operator
    });

    if (!result.ok) {
      return res.status(result.status).json({
        ok: false,
        error: result.error
      });
    }

    return res.status(200).json({
      ok: true,
      review_id: result.review_id,
      governance_decision: result.governance_decision,
      head_hash: result.head_hash,
      chain_length: result.chain_length,
      public_receipt_url: result.public_receipt_url,
      ...(result.truth_anchor ? { truth_anchor: result.truth_anchor } : {}),
      ...(result.reconciliation ? { reconciliation: result.reconciliation } : {})
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: {
        code: "OPERATOR_REVIEW_FAILED",
        message: error.message || "Operator review failed."
      }
    });
  }
}
