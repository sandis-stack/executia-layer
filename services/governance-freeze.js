import { db } from "./db.js"

export async function createFreeze({
  organization_id,
  review_id = null,
  execution_id = null,
  freeze_scope = "EXECUTION",
  freeze_reason,
  freeze_level = "L1",
  actor = {},
  metadata = {}
}) {
  if (!organization_id) throw new Error("FREEZE_ORGANIZATION_REQUIRED")
  if (!freeze_reason) throw new Error("FREEZE_REASON_REQUIRED")

  const supabase = db()

  const { data, error } = await supabase
    .from("governance_freezes")
    .insert({
      organization_id,
      review_id,
      execution_id,
      freeze_scope,
      freeze_reason,
      freeze_level,
      status: "ACTIVE",
      created_by: actor.id || null,
      created_by_email: actor.email || null,
      metadata
    })
    .select()
    .single()

  if (error) {
    console.error("[EXECUTIA] createFreeze failed", error)
    throw new Error("FREEZE_CREATE_FAILED")
  }

  await supabase.from("governance_freeze_events").insert({
    freeze_id: data.id,
    organization_id,
    event_type: "GOVERNANCE_FREEZE_CREATED",
    actor_id: actor.id || null,
    actor_email: actor.email || null,
    details: {
      freeze_scope,
      freeze_level,
      freeze_reason
    }
  })

  return data
}

export async function releaseFreeze({
  freeze_id,
  actor = {},
  metadata = {}
}) {
  if (!freeze_id) throw new Error("FREEZE_ID_REQUIRED")

  const supabase = db()

  const { data: freeze, error: freezeError } = await supabase
    .from("governance_freezes")
    .select("*")
    .eq("id", freeze_id)
    .single()

  if (freezeError || !freeze) throw new Error("FREEZE_NOT_FOUND")
  if (freeze.status !== "ACTIVE") throw new Error("FREEZE_ALREADY_RELEASED")

  const { data, error } = await supabase
    .from("governance_freezes")
    .update({
      status: "RELEASED",
      released_at: new Date().toISOString(),
      released_by: actor.id || null,
      released_by_email: actor.email || null,
      metadata: {
        ...(freeze.metadata || {}),
        ...metadata
      }
    })
    .eq("id", freeze_id)
    .select()
    .single()

  if (error) {
    console.error("[EXECUTIA] releaseFreeze failed", error)
    throw new Error("FREEZE_RELEASE_FAILED")
  }

  await supabase.from("governance_freeze_events").insert({
    freeze_id,
    organization_id: freeze.organization_id,
    event_type: "GOVERNANCE_FREEZE_RELEASED",
    actor_id: actor.id || null,
    actor_email: actor.email || null,
    details: metadata
  })

  return data
}

export async function getActiveFreeze({
  organization_id,
  review_id = null,
  execution_id = null
}) {
  if (!organization_id) throw new Error("FREEZE_ORGANIZATION_REQUIRED")

  const supabase = db()

  const { data, error } = await supabase
    .from("governance_freezes")
    .select("*")
    .eq("organization_id", organization_id)
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[EXECUTIA] getActiveFreeze failed", error)
    const err = new Error("FREEZE_LOOKUP_FAILED")
    err.code = error.code || "FREEZE_LOOKUP_FAILED"
    err.details = error.message || error.details || JSON.stringify(error)
    throw err
  }

  const freezes = data || []

  return freezes.find((freeze) => {
    if (freeze.freeze_scope === "SYSTEM") return true
    if (freeze.freeze_scope === "ORGANIZATION") return true
    if (review_id && freeze.review_id === review_id) return true
    if (execution_id && freeze.execution_id === execution_id) return true
    return false
  }) || null
}

export async function assertExecutionNotFrozen({
  organization_id,
  review_id = null,
  execution_id = null
}) {
  const activeFreeze = await getActiveFreeze({
    organization_id,
    review_id,
    execution_id
  })

  if (activeFreeze) {
    const error = new Error("EXECUTION_FROZEN")
    error.code = "EXECUTION_FROZEN"
    error.freeze = {
      id: activeFreeze.id,
      scope: activeFreeze.freeze_scope,
      level: activeFreeze.freeze_level,
      reason: activeFreeze.freeze_reason,
      created_at: activeFreeze.created_at
    }
    throw error
  }

  return true
}
