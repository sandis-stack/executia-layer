import { requireEnterpriseAuth } from "../../../../services/jwt-auth.js"
import { createFreeze } from "../../../../services/governance-freeze.js"

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

    const {
      review_id = null,
      execution_id = null,
      freeze_scope = "EXECUTION",
      freeze_reason,
      freeze_level = "L1",
      metadata = {}
    } = req.body || {}

    if (!freeze_reason) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "FREEZE_REASON_REQUIRED",
          message: "freeze_reason is required"
        }
      })
    }

    const freeze = await createFreeze({
      organization_id: auth.organization_id,
      review_id,
      execution_id,
      freeze_scope,
      freeze_reason,
      freeze_level,
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
        code: error.code || error.message || "FREEZE_CREATE_ERROR",
        message: error.message || "Freeze create failed"
      }
    })
  }
}
