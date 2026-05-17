import { createReviewToken } from "../../services/review-token.js";

export default async function handler(req, res){
  res.setHeader("Content-Type", "application/json");

  if(req.method !== "POST"){
    return res.status(405).json({
      ok:false,
      error:"METHOD_NOT_ALLOWED"
    });
  }

  try{
    const { review_id } = req.body || {};

    if(!review_id){
      return res.status(400).json({
        ok:false,
        error:"REVIEW_ID_REQUIRED"
      });
    }

    const token = createReviewToken(review_id);

    return res.status(200).json({
      ok:true,
      review_id,
      expires_in:"7d",
      url:`https://execution.executia.io/review?token=${token}`
    });

  }catch(error){
    return res.status(500).json({
      ok:false,
      error:"REVIEW_LINK_FAILED",
      details:error.message
    });
  }
}
