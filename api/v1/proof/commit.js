import { createExecutionProof } from "../../../services/execution-proof.js";
import { resolveJwtContext, requireJwtPermission } from "../../../services/jwt-auth.js";

function json(res, status, body) {
  return res.status(status).json(body);
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

    const proof = await createExecutionProof(body);

    return json(res, 201, {
      ok: true,
      mode: context.mode,
      organization_id: context.organization_id,
      user: context.user,
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
