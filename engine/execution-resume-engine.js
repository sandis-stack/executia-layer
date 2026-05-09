import crypto from "crypto"
import db from "../services/db.js"
import { materializePolicyExecution } from "../services/policy-materialization.js"

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
already_committed: true,
execution_id: review.execution_id
}
}

/*
SET RESUMING
*/

const { error: updateError } = await supabase
.from("governance_reviews")
.update({
execution_status: "RESUMING",
resumed_at: new Date().toISOString(),
resumed_by: operator_id
})
.eq("id", review_id)

if(updateError){
throw updateError
}

/*
LOAD EXECUTION PAYLOAD
*/

const executionPayload = review.execution_payload || {}

const execution_id = review.execution_id

/*
MATERIALIZE EXECUTION
*/

const materialization = await materializePolicyExecution({
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
organization_id,
event_type: "GOVERNANCE_EXECUTION_RESUMED",
event_payload: {
operator_id,
materialization
},
created_at: new Date().toISOString()
}

const { error: eventError } = await supabase
.from("governance_review_events")
.insert(governanceEvent)

if(eventError){
throw eventError
}

return {
ok: true,
review_id,
execution_id,
execution_status: "COMMITTED",
materialization
}

}