import {
  resolveJwtContext,
  requireJwtPermission
} from "../../../../services/jwt-auth.js"

import { getActiveFreeze } from "../../../../services/governance-freeze.js"

function json(res, status, body) {
  return res.status(status).json(body)
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return json(res, 405, {
        ok: false,
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: "GET required"
        }
      })
    }

    const context = await resolveJwtContext(req)

    const permission = requireJwtPermission(
      context,
      "governance.review.read"
    )

    if (!permission.ok) {
      return json(res, permission.status || 401, {
        ok: false,
        error: {
          code: permission.error || "UNAUTHORIZED",
          message: permission.reason || "Governance read permission required."
        }
      })
    }

    const {
      review_id = null,
      execution_id = null
    } = req.query || {}

    const active_freeze = await getActiveFreeze({
      organization_id: context.organization_id,
      review_id: review_id || null,
      execution_id: execution_id || null
    })

    return json(res, 200, {
      ok: true,
      mode: context.mode,
      organization_id: context.organization_id,
      user: context.user,
      frozen: Boolean(active_freeze),
      active_freeze
    })
  } catch (error) {
    return json(res, 500, {
      ok: false,
      error: {
        code: error.code || error.message || "FREEZE_STATUS_ERROR",
        message: error.message || "Freeze status failed"
      }
    })
  }
}
