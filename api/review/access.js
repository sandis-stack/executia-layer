import { db } from "../../services/db.js";
import { verifyReviewToken } from "../../services/review-token.js";

export default async function handler(req, res){
  res.setHeader("Content-Type", "application/json");

  if(req.method !== "GET"){
    return res.status(405).json({
      ok:false,
      error:"METHOD_NOT_ALLOWED"
    });
  }

  try{
    const token = req.query.token || "";

    const verified = verifyReviewToken(token);

    if(!verified.ok){
      return res.status(401).json({
        ok:false,
        error:verified.error || "INVALID_REVIEW_TOKEN"
      });
    }

    const reviewId = verified.payload.review_id;

    const reviewResult = await db()
      .from("governance_reviews")
      .select("*")
      .eq("id", reviewId)
      .single();

    if(reviewResult.error){
      return res.status(404).json({
        ok:false,
        error:"REVIEW_NOT_FOUND"
      });
    }

    try{
      await db()
        .from("governance_review_events")
        .insert({
          review_id: reviewResult.data.id,
          execution_id: reviewResult.data.execution_id,
          actor: "client",
          event_type: "REVIEW_LINK_OPENED",
          payload: {
            opened_at: new Date().toISOString(),
            user_agent: req.headers["user-agent"] || "UNKNOWN",
            ip:
              req.headers["x-forwarded-for"] ||
              req.socket?.remoteAddress ||
              "UNKNOWN"
          }
        });
    }catch(eventError){
      console.error("REVIEW_OPEN_EVENT_FAILED", eventError);
    }

    const eventsResult = await db()
      .from("governance_review_events")
      .select("*")
      .eq("review_id", reviewId)
      .order("created_at", { ascending:true });

    return res.status(200).json({
      ok:true,
      access:"CLIENT_REVIEW_READ_ONLY",
      review:reviewResult.data,
      events:eventsResult.data || []
    });

  }catch(error){
    return res.status(500).json({
      ok:false,
      error:"REVIEW_ACCESS_FAILED",
      details:error.message
    });
  }
}
