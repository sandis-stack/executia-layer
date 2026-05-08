import { createExecutionProof } from "../../../services/execution-proof.js";
import { resolveJwtContext, requireJwtPermission } from "../../../services/jwt-auth.js";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import { resolveGovernanceDecision } from "../../../engine/governance-resolver.js";
import { evaluatePolicyDecision } from "../../../engine/policy-engine.js";
import { materializePolicyDecision } from "../../../services/policy-materialization.js";
import { createGovernanceReview } from "../../../engine/governance-review-engine.js";

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
    if (req.method === "GET") {
      return json(res, 200, {
        ok: true,
        engine: "EXECUTIA™",
        endpoint: "/api/v1/proof/commit",
        method: "POST",
        purpose: "Commit execution and return unified execution proof object.",
        flow: [
          "REQUEST",
          "VALIDATION",
          "POLICY",
          "DECISION",
          "LEDGER",
          "AUDIT",
          "TRACE",
          "COMMIT"
        ],
        auth: "Bearer JWT required"
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
    const permission = requireJwtPermission(context, "execute");

    if (!permission.ok) {
      return json(res, permission.status || 401, {
        ok: false,
        error: {
          code: permission.error || "UNAUTHORIZED",
          message: permission.reason || "JWT authentication or execute permission required."
        }
      });
    }

    const body = {
      ...(req.body || {}),
      organization_id: context.organization_id,
      operator_user_id: context.user?.id || null,
      operator_email: context.user?.email || null,
      operator_role: context.user?.role || context.role || null
    };


    if (process.env.EXECUTIA_GOVERNANCE_V2_ENABLED === "true") {
      const governance = await resolveGovernanceDecision({
        supabase: db(),
        request: body
      });

      if (!governance.ok) {
        return json(res, 403, {
          ok: false,
          mode: context.mode,
          organization_id: context.organization_id,
          governance
        });
      }

      body.governance = governance;

      const policy = await evaluatePolicyDecision({
        supabase: db(),
        request: body,
        governance
      });

      body.policy = policy;

      if (
        policy.decision === "BLOCK_COMMIT"
      ) {
        return json(res, 403, {
          ok: false,
          mode: context.mode,
          organization_id: context.organization_id,
          governance,
          policy
        });
      }

      if (
        policy.decision === "PENDING_REVIEW"
      ) {

        const governance_review =
          await createGovernanceReview({
            supabase: db(),
            request: body,
            governance,
            policy
          });

        return json(res, 202, {
          ok: true,
          pending_review: true,
          mode: context.mode,
          organization_id: context.organization_id,
          governance,
          policy,
          governance_review
        });
      }
    }

    const proof = await createExecutionProof(body);

    let governance_materialization = null;

    if (
      process.env.EXECUTIA_GOVERNANCE_V2_ENABLED === "true" &&
      body.governance &&
      body.policy
    ) {
      governance_materialization =
        await materializePolicyDecision({
          supabase: db(),
          request: body,
          governance: body.governance,
          policy: body.policy,
          proof
        });
    }

    return json(res, 201, {
      ok: true,
      mode: context.mode,
      organization_id: context.organization_id,
      user: context.user,
      governance: body.governance || null,
      policy: body.policy || null,
      governance_materialization,
      proof
    });
  } catch (error) {
    console.error("[EXECUTIA PROOF COMMIT ERROR]", error);

    return json(res, 500, {
      ok: false,
      error: {
        code: error.code || "PROOF_COMMIT_FAILED",
        message: error.message || "Execution proof commit failed."
      }
    });
  }
}
