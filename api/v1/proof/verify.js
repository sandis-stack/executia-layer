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

    const result = await db()
      .from("governance_review_events")
      .select("*")
      .eq("review_id", review_id)
      .order("sequence_no", {
        ascending:true
      });

    if(result.error){
      throw result.error;
    }

    const events =
      result.data || [];

    let verified = true;
    let broken_at = null;

    for(let i = 1; i < events.length; i++){

      const prev =
        events[i - 1];

      const current =
        events[i];

      const isGenesisTransition =
        i === 1 &&
        (
          current.prev_hash === null ||
          current.prev_hash === "" ||
          !current.prev_hash
        );

      if(isGenesisTransition){
        continue;
      }

      if(current.prev_hash !== prev.hash){
        verified = false;
        broken_at = current.id;
        break;
      }
    }

    return res.status(200).json({
      ok:true,
      review_id,
      immutable_chain_verified:
        verified,
      verified,
      broken_at,
      events_checked:
        events.length,
      head_hash:
        events.length
          ? events[events.length - 1].hash
          : null,
      event_types:
        events.map(e => e.event_type)
    });

  }catch(error){

    return res.status(500).json({
      ok:false,
      error:"PROOF_VERIFICATION_FAILED",
      details:error.message
    });
  }
}
