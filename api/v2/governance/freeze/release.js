import { requireEnterpriseAuth } from "../../../../services/jwt-auth.js"
import { releaseFreeze } from "../../../../services/governance-freeze.js"

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        ok: false,
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: "POST required"
        }
      })
    }

    const auth = await requireEnterpriseAuth(req)

    if (auth.user?.role !== "SUPERVISOR") {
      return res.status(403).json({
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
      return res.status(400).json({
        ok: false,
        error: {
          code: "FREEZE_ID_REQUIRED",
          message: "freeze_id is required"
        }
      })
    }

    const freeze = await releaseFreeze({
      freeze_id,
      actor: auth.user,
      metadata
    })

    return res.status(200).json({
      ok: true,
      mode: auth.mode,
      organization_id: auth.organization_id,
      user: auth.user,
      freeze
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: {
        code: error.code || error.message || "FREEZE_RELEASE_ERROR",
        message: error.message || "Freeze release failed"
      }
    })
  }
}
