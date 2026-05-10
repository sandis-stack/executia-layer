import {
  assertFreezeReleaseAllowed,
  assertL4OverrideAllowed
} from "../../../services/governance-constitution.js";

import {
  resolveJwtContext,
  requireJwtPermission
} from "../../../../services/jwt-auth.js"

import {
  assertFreezeReleaseAllowed,
  assertL4OverrideAllowed
} from "../../../services/governance-constitution.js";

import { releaseFreeze } from "../../../../services/governance-freeze.js"

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

    if (context.user?.role !== "SUPERVISOR") {
      return json(res, 403, {
        ok: false,
        error: {
          code: "GOVERNANCE_ROLE_NOT_AUTHORIZED",
          message: "Only SUPERVISOR can release governance freeze"
        }
      })
    }

    const {
      freeze_id,
      metadata = {}
    } = req.body || {}

    if (!freeze_id) {
      return json(res, 400, {
        ok: false,
        error: {
          code: "FREEZE_ID_REQUIRED",
          message: "freeze_id is required"
        }
      })
    }

    const freeze = await releaseFreeze({
      freeze_id,
      actor: context.user,
      metadata
    })

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
        code: error.code || error.message || "FREEZE_RELEASE_ERROR",
        message: error.message || "Freeze release failed"
      }
    })
  }
}
