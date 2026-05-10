import { db } from "../../../../services/db.js"

import {
  resolveJwtContext,
  requireJwtPermission
} from "../../../../services/jwt-auth.js"

import {
  verifyGovernanceHashChain
} from "../../../../services/governance-hash.js"

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

    const supabase = db()

    const verification = await verifyGovernanceHashChain({
      supabase,
      review_id: "GLOBAL"
    })

    const { data: reviews, error: reviewsError } = await supabase
      .from("governance_reviews")
      .select("id, review_status, governance_state, execution_status, escalation_level, risk_score, created_at")
      .eq("organization_id", context.organization_id)
      .order("created_at", { ascending: false })
      .limit(100)

    if (reviewsError) throw reviewsError

    const { data: freezes, error: freezesError } = await supabase
      .from("governance_freezes")
      .select("*")
      .eq("organization_id", context.organization_id)
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: false })

    if (freezesError) throw freezesError

    const items = reviews || []

    const open_reviews = items.filter((r) => r.review_status === "OPEN").length
    const quorum_pending = items.filter((r) => r.governance_state === "QUORUM_PENDING").length
    const committed = items.filter((r) => r.execution_status === "COMMITTED").length
    const frozen_reviews = items.filter((r) => r.governance_state === "FROZEN").length
    const high_risk = items.filter((r) => Number(r.risk_score || 0) >= 80).length

    const system_state =
      verification.verified && !(freezes || []).length
        ? "OPERATIONAL"
        : verification.verified
        ? "LOCKDOWN_ACTIVE"
        : "FORENSIC_LOCK"

    return json(res, 200, {
      ok: true,
      type: "EXECUTIA_GOVERNANCE_OPERATIONS_STATUS",
      mode: context.mode,
      organization_id: context.organization_id,
      user: context.user,
      generated_at: new Date().toISOString(),

      system_state,

      chain: {
        verified: verification.verified,
        scope: verification.scope || "GLOBAL_GOVERNANCE_CHAIN",
        events_checked: verification.events_checked || 0,
        head_hash: verification.head_hash || null,
        broken_at: verification.broken_at || null,
        reason: verification.reason || null
      },

      governance: {
        open_reviews,
        quorum_pending,
        committed,
        frozen_reviews,
        high_risk,
        total_recent_reviews: items.length
      },

      emergency: {
        active_freezes: freezes || [],
        active_freeze_count: (freezes || []).length
      },

      operations_flags: {
        approvals_enabled: verification.verified && !(freezes || []).length,
        freeze_enabled: true,
        proof_export_enabled: true,
        forensic_mode: !verification.verified,
        supervisor_required: Boolean((freezes || []).length)
      }
    })
  } catch (error) {
    console.error("[EXECUTIA GOVERNANCE OPERATIONS STATUS ERROR]", error)

    return json(res, 500, {
      ok: false,
      error: {
        code: error.code || "GOVERNANCE_OPERATIONS_STATUS_FAILED",
        message: error.message || "Governance operations status failed."
      }
    })
  }
}
