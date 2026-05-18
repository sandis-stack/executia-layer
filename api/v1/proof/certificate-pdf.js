import { db } from "../../../services/db.js";

export default async function handler(req, res){

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
      return res.status(400).send(
        "REVIEW_ID_REQUIRED"
      );
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

    const headHash =
      hashedEvents.length
        ? hashedEvents[hashedEvents.length - 1].hash
        : "NONE";

    const lines = [
      "EXECUTIA IMMUTABLE PROOF CERTIFICATE",
      "",
      `Generated UTC: ${new Date().toISOString()}`,
      `Review ID: ${review_id}`,
      "",
      `Immutable Chain Verified: ${verified}`,
      `Governance Decision: ${reviewResult.data.governance_decision}`,
      `Review Status: ${reviewResult.data.review_status}`,
      `Risk Score: ${reviewResult.data.risk_score}`,
      `Hashed Events Checked: ${hashedEvents.length}`,
      "",
      `Head Hash:`,
      headHash,
      "",
      "EVENT CHAIN",
      "----------------------------------------"
    ];

    for(const event of events){

      lines.push(
        `${event.sequence_no} | ${event.event_type}`
      );

      lines.push(
        `UTC: ${event.created_at}`
      );

      if(event.hash){
        lines.push(
          `HASH: ${event.hash}`
        );

        lines.push(
          `PREV: ${event.prev_hash}`
        );
      }

      lines.push("");
    }

    const content =
      lines.join("\n");

    res.setHeader(
      "Content-Type",
      "text/plain; charset=utf-8"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="executia-proof-${review_id}.txt"`
    );

    return res.status(200).send(content);

  }catch(error){

    return res.status(500).json({
      ok:false,
      error:"PROOF_CERTIFICATE_EXPORT_FAILED",
      details:error.message
    });
  }
}
