import { db } from "../../../services/db.js";
import { requireInternalKey, unauthorizedResponse } from "../../../services/auth.js";

export default async function handler(req, res){
  res.setHeader("Content-Type", "application/json");

  if(req.method !== "GET"){
    return res.status(405).json({
      ok:false,
      error:"METHOD_NOT_ALLOWED"
    });
  }

  const auth = requireInternalKey(req);
  if (!auth.ok) {
    return res.status(401).json(unauthorizedResponse());
  }

  try{
    const { data:requests, error } = await db()
      .from("execution_requests")
      .select("*")
      .order("created_at", { ascending:false })
      .limit(50);

    if(error){
      return res.status(500).json({
        ok:false,
        error:"REQUEST_LIST_FAILED",
        details:error.message
      });
    }

    const requestIds = (requests || []).map(item => item.id);

    let reviewMap = new Map();

    if(requestIds.length){
      const { data:reviews } = await db()
        .from("governance_reviews")
        .select("id, execution_id, review_status, governance_decision, risk_score")
        .in("execution_id", requestIds);

      reviewMap = new Map(
        (reviews || []).map(review => [review.execution_id, review])
      );
    }

    const enriched = (requests || []).map(item => {
      const review = reviewMap.get(item.id) || null;

      return {
        ...item,
        governance_review_id: review?.id || null,
        governance_review_status: review?.review_status || null,
        governance_decision: review?.governance_decision || null,
        governance_risk_score: review?.risk_score || null
      };
    });

    return res.status(200).json({
      ok:true,
      count:enriched.length,
      requests:enriched
    });

  }catch(error){
    return res.status(500).json({
      ok:false,
      error:error.code || "REQUEST_LIST_PIPELINE_FAILED",
      details:error.message
    });
  }
}
