import crypto from "crypto"
import { db } from "../services/db.js"
import { materializePolicyDecision } from "../services/policy-materialization.js"
import { insertGovernanceEvent } from "../services/governance-hash.js"

export async function resumeGovernedExecution({
review_id,
operator_id,
organization_id
}) {

if(!review_id){
throw new Error("review_id_required")
}

const supabase = db()

/*
LOAD REVIEW
*/

const { data: review, error: reviewError } = await supabase
.from("governance_reviews")
.select("*")
.eq("id", review_id)
.single()

if(reviewError || !review){
throw new Error("review_not_found")
}

if(review.organization_id !== organization_id){
throw new Error("organization_scope_violation")
}

if(review.review_status !== "APPROVED"){
throw new Error("review_not_approved")
}

if(!review.execution_id){
throw new Error("execution_id_missing")
}

/*
PREVENT DOUBLE RESUME
*/

if(review.execution_status === "COMMITTED"){

return {
ok: true,
already_processed: true,
execution_id: review.execution_id,
execution_status: review.execution_status
}

}

/*
SET RESUMING
*/

if(review.execution_status !== "RESUMING"){

const { data: lockResult, error: updateError } = await supabase
.from("governance_reviews")
.update({
execution_status: "RESUMING",
resumed_at: new Date().toISOString(),
resumed_by: operator_id
})
.eq("id", review_id)
.eq("execution_status", "PENDING_REVIEW")
.select()

if(updateError){
throw updateError
}

if(!lockResult || lockResult.length === 0){

return {
ok: true,
already_locked: true,
execution_id,
execution_status: review.execution_status
}

}

}

/*
LOAD EXECUTION PAYLOAD
*/

const executionPayload = review.execution_payload || {}

const execution_id = review.execution_id

/*
MATERIALIZE EXECUTION
*/

const materialization = await materializePolicyDecision({
execution_id,
organization_id,
payload: executionPayload
})

/*
FINALIZE GOVERNANCE
*/

const { error: finalizeError } = await supabase
.from("governance_reviews")
.update({
execution_status: "COMMITTED",
committed_at: new Date().toISOString()
})
.eq("id", review_id)

if(finalizeError){
throw finalizeError
}

/*
APPEND GOVERNANCE EVENT
*/

const governanceEvent = {
id: crypto.randomUUID(),
review_id,
execution_id,
actor: operator_email || operator_id || "SYSTEM",
event_type: "GOVERNANCE_EXECUTION_RESUMED",
payload: {
operator_id,
operator_email,
execution_status: "COMMITTED",
materialization
},
created_at: new Date().toISOString()
}

const insertedEvent =
  await insertGovernanceEvent({
    supabase,
    event: governanceEvent
  })

return {
ok: true,
review_id,
execution_id,
execution_status: "COMMITTED",
materialization
}

}