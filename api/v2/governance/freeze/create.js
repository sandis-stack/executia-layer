import {
  resolveJwtContext,
  requireJwtPermission
} from "../../../../services/jwt-auth.js"

import { createFreeze } from "../../../../services/governance-freeze.js"
import { GOVERNANCE_STATES } from "../../../../services/governance-state.js"

function json(res, status, body) {
  return res.status(status).json(body)
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return json(res, 405, {
        ok: false,
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: "POST required"
        }
      })
    }

    const context = await resolveJwtContext(req)

    const permission = requireJwtPermission(
      context,
      "governance.review.freeze"
    )

    if (!permission.ok) {
      return json(res, permission.status || 401, {
        ok: false,
        error: {
          code: permission.error || "UNAUTHORIZED",
          message: permission.reason || "Governance freeze permission required."
        }
      })
    }

    const {
      review_id = null,
      execution_id = null,
      freeze_scope = "EXECUTION",
      freeze_reason,
      freeze_level = "L1",
      metadata = {}
    } = req.body || {}

    if (!freeze_reason) {
      return json(res, 400, {
        ok: false,
        error: {
          code: "FREEZE_REASON_REQUIRED",
          message: "freeze_reason is required"
        }
      })
    }

    const freeze = await createFreeze({
      organization_id: context.organization_id,
      review_id,
      execution_id,
      freeze_scope,
      freeze_reason,
      freeze_level,
      actor: context.user,
      metadata
    })

    if (review_id) {
      const { db } = await import("../../../../services/db.js")
      await db()
        .from("governance_reviews")
        .update({
          governance_state: GOVERNANCE_STATES.FROZEN,
          updated_at: new Date().toISOString()
        })
        .eq("id", review_id)
    }

    return json(res, 200, {
      ok: true,
      mode: context.mode,
      organization_id: context.organization_id,
      user: context.user,
      freeze
    })
  } catch (error) {
    return json(res, 500, {
      ok: false,
      error: {
        code: error.code || error.message || "FREEZE_CREATE_ERROR",
        message: error.message || "Freeze create failed"
      }
    })
  }
}
