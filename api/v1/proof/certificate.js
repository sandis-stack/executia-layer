import { db } from "../../../services/db.js";

export default async function handler(req, res){

  res.setHeader(
    "Content-Type",
    "application/json"
  );

  if(req.method !== "GET"){
    return res.status(405).json({
      ok:false,
      error:"METHOD_NOT_ALLOWED"
    });
  }

  try{

    const review_id =
      req.query.review_id || "";

    if(!review_id){
      return res.status(400).json({
        ok:false,
        error:"REVIEW_ID_REQUIRED"
      });
    }

    const reviewResult = await db()
      .from("governance_reviews")
      .select("*")
      .eq("id", review_id)
      .single();

    if(reviewResult.error){
      throw reviewResult.error;
    }

    const eventsResult = await db()
      .from("governance_review_events")
      .select("*")
      .eq("review_id", review_id)
      .order("sequence_no", {
        ascending:true
      });

    const events =
      eventsResult.data || [];

    const hashedEvents =
      events.filter(e => e.hash);

    const signatureEvent =
      events.find(
        e => e.event_type === "OPERATOR_SIGNATURE_RECORDED"
      );

    let verified = true;

    for(let i = 1; i < hashedEvents.length; i++){

      const prev =
        hashedEvents[i - 1];

      const current =
        hashedEvents[i];

      if(current.prev_hash !== prev.hash){
        verified = false;
        break;
      }
    }

    return res.status(200).json({
      ok:true,
      certificate:{
        generated_at:
          new Date().toISOString(),

        review_id,

        immutable_chain_verified:
          verified,

        governance_decision:
          reviewResult.data.governance_decision,

        review_status:
          reviewResult.data.review_status,

        risk_score:
          reviewResult.data.risk_score,

        signature_verified:
          !!signatureEvent,

        signature_event_hash:
          signatureEvent?.hash || null,

        hashed_events_checked:
          hashedEvents.length,

        head_hash:
          hashedEvents.length
            ? hashedEvents[hashedEvents.length - 1].hash
            : null,

        event_chain:
          events.map(e => ({
            sequence_no: e.sequence_no,
            event_type: e.event_type,
            hash: e.hash,
            prev_hash: e.prev_hash,
            created_at: e.created_at
          }))
      }
    });

  }catch(error){

    return res.status(500).json({
      ok:false,
      error:"PROOF_CERTIFICATE_FAILED",
      details:error.message
    });
  }
}
