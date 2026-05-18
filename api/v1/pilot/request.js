import crypto from "crypto";

function uuid(){
  return crypto.randomUUID();
}

export default async function handler(req,res){

  if(req.method !== "POST"){
    return res.status(405).json({
      ok:false,
      error:{
        code:"METHOD_NOT_ALLOWED"
      }
    });
  }

  const body = req.body || {};

  return res.status(200).json({
    ok:true,
    review_id:uuid(),
    state:"PILOT_REVIEW_RECEIVED",
    domain:body.domain || "UNKNOWN",
    received_at:new Date().toISOString()
  });
}
