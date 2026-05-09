import { requireEnterpriseAuth } from "../../../../services/jwt-auth.js"
import { getActiveFreeze } from "../../../../services/governance-freeze.js"

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({
        ok: false,
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: "GET required"
        }
      })
    }

    const auth = await requireEnterpriseAuth(req)

    const {
      review_id = null,
      execution_id = null
    } = req.query || {}

    const active_freeze = await getActiveFreeze({
      organization_id: auth.organization_id,
      review_id: review_id || null,
      execution_id: execution_id || null
    })

    return res.status(200).json({
      ok: true,
      mode: auth.mode,
      organization_id: auth.organization_id,
      user: auth.user,
      frozen: Boolean(active_freeze),
      active_freeze
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: {
        code: error.code || error.message || "FREEZE_STATUS_ERROR",
        message: error.message || "Freeze status failed"
      }
    })
  }
}
